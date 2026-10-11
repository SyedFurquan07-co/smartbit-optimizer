import * as pdfjsLib from 'pdfjs-dist';
import { PdfExtractionResult, ExtractedPage } from '../types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

export interface ExtractionOptions {
  maxSizeBytes?: number; // Default 25 MB
  maxPages?: number; // Default 50 pages
  timeoutMs?: number; // Default 30,000 ms
  onProgress?: (current: number, total: number) => void;
}

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_TIMEOUT_MS = 35000;

/**
 * Validates the raw binary buffer of a file to confirm valid PDF magic numbers (%PDF-)
 */
export async function validatePdfSignature(file: File): Promise<boolean> {
  const headerSlice = file.slice(0, 5);
  const buffer = await headerSlice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // %PDF- in ASCII is 0x25, 0x50, 0x44, 0x46, 0x2D
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/**
 * Safely extracts text, structure, and page numbers from a validated PDF file.
 */
export async function extractTextFromPdf(
  file: File,
  optionsOrProgress?: ExtractionOptions | ((current: number, total: number) => void)
): Promise<PdfExtractionResult> {
  const options: ExtractionOptions =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress }
      : optionsOrProgress || {};
  const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE;
  const maxPages = options.maxPages || DEFAULT_MAX_PAGES;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  // 1. Validate file size
  if (file.size > maxSize) {
    const sizeMb = (maxSize / (1024 * 1024)).toFixed(0);
    throw new Error(`File exceeds maximum allowed size of ${sizeMb} MB.`);
  }

  if (file.size === 0) {
    throw new Error('File is empty (0 bytes). Please upload a valid PDF document.');
  }

  // 2. Validate PDF signature (magic bytes)
  const isValidPdf = await validatePdfSignature(file);
  if (!isValidPdf) {
    throw new Error('Invalid file format. The file does not have a genuine PDF header (%PDF-).');
  }

  // 3. Read array buffer with timeout protection
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    stopAtErrors: false,
    isEvalSupported: false,
  });

  // Timeout promise
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      loadingTask.destroy();
      reject(new Error(`PDF processing timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);
  });

  try {
    const pdfDocument = await Promise.race([loadingTask.promise, timeoutPromise]);
    clearTimeout(timeoutId);

    const numPages = pdfDocument.numPages;

    if (numPages === 0) {
      throw new Error('PDF contains no readable pages.');
    }

    const pagesToExtract = Math.min(numPages, maxPages);
    const extractedPages: ExtractedPage[] = [];
    let fullText = '';
    let totalChars = 0;

    for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
      if (options.onProgress) {
        options.onProgress(pageNum, pagesToExtract);
      }
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
      });

      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          const textItem = item as { str: string; transform?: number[]; hasEOL?: boolean };
          const currentY = textItem.transform ? textItem.transform[5] : null;

          // Add newline if vertical position shifted significantly or hasEOL
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 8) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ') && !textItem.str.startsWith(' ')) {
            pageText += ' ';
          }

          pageText += textItem.str;
          if (textItem.hasEOL) {
            pageText += '\n';
          }
          lastY = currentY;
        }
      }

      // Normalize multiple consecutive blank lines
      const cleanPageText = pageText.replace(/\n{3,}/g, '\n\n').trim();
      const pageCharCount = cleanPageText.length;
      totalChars += pageCharCount;

      extractedPages.push({
        pageNumber: pageNum,
        text: cleanPageText,
        characterCount: pageCharCount,
      });

      if (cleanPageText) {
        fullText += `--- [Page ${pageNum}] ---\n${cleanPageText}\n\n`;
      }
    }

    // Detect scanned / image-only documents
    // If average characters per page is less than 20, document is likely scanned / image-only
    const isScannedOnly = totalChars < 50 || (totalChars / pagesToExtract) < 25;

    return {
      fileName: file.name,
      fileSize: file.size,
      pageCount: numPages,
      pages: extractedPages,
      fullText: fullText.trim(),
      totalCharacters: totalChars,
      isScannedOnly,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Identify password-protected/encrypted files
    if (
      err?.name === 'PasswordException' ||
      err?.message?.toLowerCase().includes('password') ||
      err?.message?.toLowerCase().includes('encrypted')
    ) {
      throw new Error(
        'This PDF document is encrypted or password-protected. Please provide an unlocked document.'
      );
    }

    if (err?.message?.includes('Invalid PDF structure') || err?.name === 'InvalidPDFException') {
      throw new Error('The PDF document is corrupted, malformed, or has an unsupported structure.');
    }

    throw err;
  }
}

export const extractPdfText = extractTextFromPdf;

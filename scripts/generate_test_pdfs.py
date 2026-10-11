import os

# 1. Valid PDF with text
def create_valid_pdf(filename):
    content = b"""%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R]
  /Count 2
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 5 0 R
    >>
  >>
  /Contents 6 0 R
>>
endobj
4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 5 0 R
    >>
  >>
  /Contents 7 0 R
>>
endobj
5 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
6 0 obj
<<
  /Length 145
>>
stream
BT
/F1 18 Tf
50 720 Td
(Smartbit Cloud Infrastructure Proposal) Tj
/F1 12 Tf
0 -30 Td
(Executive Summary: Multi-region failover and real-time database optimization.) Tj
ET
endstream
endobj
7 0 obj
<<
  /Length 160
>>
stream
BT
/F1 14 Tf
50 720 Td
(Page 2: Risk Flags & Architecture Recommendations) Tj
/F1 12 Tf
0 -30 Td
(High availability architecture with automated backup pipelines and RLS enforcement.) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000247 00000 n 
0000000379 00000 n 
0000000448 00000 n 
0000000647 00000 n 
trailer
<<
  /Size 8
  /Root 1 0 R
>>
startxref
861
%%EOF
"""
    with open(filename, 'wb') as f:
        f.write(content)

# 2. Scanned / image-only PDF (no text stream)
def create_scanned_pdf(filename):
    content = b"""%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources << >>
  /Contents 4 0 R
>>
endobj
4 0 obj
<<
  /Length 0
>>
stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000109 00000 n 
0000000201 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
252
%%EOF
"""
    with open(filename, 'wb') as f:
        f.write(content)

# 3. Corrupt / invalid header file
def create_corrupt_pdf(filename):
    with open(filename, 'wb') as f:
        f.write(b"NOT A REAL PDF FILE HEADER 123456789")

os.makedirs('test_docs', exist_ok=True)
create_valid_pdf('test_docs/valid_proposal.pdf')
create_scanned_pdf('test_docs/scanned_only.pdf')
create_corrupt_pdf('test_docs/corrupt.pdf')
print("Test PDFs created successfully in test_docs/")

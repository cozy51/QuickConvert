export type ToolId = 'excel-csv' | 'csv-excel' | 'excel-markdown' | 'excel-pdf' | 'images-pdf' | 'image-format' | 'video-audio' | 'pptx-pdf' | 'word-pdf' | 'pdf-markdown';
export type OutputFile = { name: string; blob: Blob; url: string };
export type Status = 'idle' | 'processing' | 'done' | 'error';

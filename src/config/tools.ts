import { FileDown, FileSpreadsheet, FileImage, FileText, FileType2, FileVideo, Images, Presentation, Sheet, TableProperties } from 'lucide-react';
import type { ToolId } from '../types';
export const tools: { id: ToolId; title: string; short: string; description: string; accept: string; multiple: boolean; icon: typeof Sheet; tone: string }[] = [
  { id:'excel-csv', title:'Excel → CSV', short:'Excel → CSV', description:'シートを選んでCSVへ変換', accept:'.xlsx,.xlsm,.xls', multiple:true, icon:FileSpreadsheet, tone:'mint' },
  { id:'csv-excel', title:'CSV → Excel', short:'CSV → Excel', description:'CSVを.xlsx形式へ変換', accept:'.csv,.tsv', multiple:true, icon:Sheet, tone:'blue' },
  { id:'excel-markdown', title:'Excel → Markdown', short:'Excel → Markdown', description:'シートをMarkdownテーブルへ変換', accept:'.xlsx,.xlsm,.xls', multiple:true, icon:TableProperties, tone:'blue' },
  { id:'excel-pdf', title:'Excel → PDF', short:'Excel → PDF', description:'ブック全体を印刷範囲に合わせてPDFへ', accept:'.xlsx,.xlsm,.xls', multiple:true, icon:FileText, tone:'mint' },
  { id:'images-pdf', title:'画像 → PDF', short:'画像 → PDF', description:'複数の画像を1つのPDFへ', accept:'image/png,image/jpeg,image/svg+xml,image/heic,image/heif,.heic,.heif', multiple:true, icon:Images, tone:'violet' },
  { id:'image-format', title:'画像形式変換', short:'PNG・JPEG・WebP・SVG・HEIC', description:'画像をPNG・JPEG・WebPへ変換', accept:'image/png,image/jpeg,image/webp,image/svg+xml,image/heic,image/heif,.heic,.heif', multiple:true, icon:FileImage, tone:'orange' },
  { id:'video-audio', title:'動画 → 音声', short:'MP4 → MP3', description:'MP4から音声をMP3として抽出', accept:'video/mp4,.mp4', multiple:true, icon:FileVideo, tone:'violet' },
  { id:'pptx-pdf', title:'PowerPoint → PDF', short:'PPTX → PDF', description:'スライドの見た目を保ってPDFへ変換', accept:'.pptx', multiple:true, icon:Presentation, tone:'orange' },
  { id:'word-pdf', title:'Word → PDF', short:'Word → PDF', description:'Word文書をPDFへ変換', accept:'.docx', multiple:true, icon:FileType2, tone:'blue' },
  { id:'pdf-markdown', title:'PDF → Markdown', short:'PDF → Markdown', description:'PDFの文章をMarkdownへ変換', accept:'.pdf', multiple:true, icon:FileDown, tone:'violet' },
];

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type ConversionSource = 'excel' | 'csv' | 'png' | 'jpeg' | 'webp' | 'svg' | 'heic' | 'mp4' | 'pptx' | 'word' | 'pdf';

export const conversionGroups: {
  id: ConversionSource;
  label: string;
  icon: typeof Sheet;
  accept: string;
  outputs: { label: string; tool: ToolId; format?: ImageFormat }[];
}[] = [
  { id:'excel', label:'Excel', icon:FileSpreadsheet, accept:'.xlsx,.xlsm,.xls', outputs:[
    { label:'CSV', tool:'excel-csv' },
    { label:'Markdown', tool:'excel-markdown' },
    { label:'PDF', tool:'excel-pdf' },
  ] },
  { id:'csv', label:'CSV', icon:Sheet, accept:'.csv,.tsv', outputs:[{ label:'Excel', tool:'csv-excel' }] },
  { id:'png', label:'PNG', icon:FileImage, accept:'image/png', outputs:[
    { label:'PDF', tool:'images-pdf' },
    { label:'JPEG', tool:'image-format', format:'jpeg' },
    { label:'WebP', tool:'image-format', format:'webp' },
  ] },
  { id:'jpeg', label:'JPEG', icon:FileImage, accept:'image/jpeg', outputs:[
    { label:'PDF', tool:'images-pdf' },
    { label:'PNG', tool:'image-format', format:'png' },
    { label:'WebP', tool:'image-format', format:'webp' },
  ] },
  { id:'webp', label:'WebP', icon:FileImage, accept:'image/webp', outputs:[
    { label:'PNG', tool:'image-format', format:'png' },
    { label:'JPEG', tool:'image-format', format:'jpeg' },
  ] },
  { id:'svg', label:'SVG', icon:FileImage, accept:'image/svg+xml,.svg', outputs:[
    { label:'PDF', tool:'images-pdf' },
    { label:'PNG', tool:'image-format', format:'png' },
    { label:'JPEG', tool:'image-format', format:'jpeg' },
    { label:'WebP', tool:'image-format', format:'webp' },
  ] },
  { id:'heic', label:'HEIC', icon:FileImage, accept:'image/heic,image/heif,.heic,.heif', outputs:[
    { label:'PDF', tool:'images-pdf' },
    { label:'PNG', tool:'image-format', format:'png' },
    { label:'JPEG', tool:'image-format', format:'jpeg' },
    { label:'WebP', tool:'image-format', format:'webp' },
  ] },
  { id:'mp4', label:'MP4', icon:FileVideo, accept:'video/mp4,.mp4', outputs:[
    { label:'MP3', tool:'video-audio' },
  ] },
  { id:'pptx', label:'PowerPoint', icon:Presentation, accept:'.pptx', outputs:[
    { label:'PDF', tool:'pptx-pdf' },
  ] },
  { id:'word', label:'Word', icon:FileType2, accept:'.docx', outputs:[
    { label:'PDF', tool:'word-pdf' },
  ] },
  { id:'pdf', label:'PDF', icon:FileDown, accept:'.pdf', outputs:[
    { label:'Markdown', tool:'pdf-markdown' },
  ] },
];

// 変換後の選択肢は常に同じ並びで表示し、変換前の形式に応じて選択可否だけを切り替える
export const outputLabels = ['PDF', 'Markdown', 'CSV', 'Excel', 'PNG', 'JPEG', 'WebP', 'MP3'] as const;

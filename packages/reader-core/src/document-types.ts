export type TextBlock = { id: string; type: "text"; text: string };
export type ImageBlock = { id: string; type: "image"; src: string; alt: string };
export type TableCell = {
  text: string;
  header: boolean;
  rowSpan: number;
  colSpan: number;
  scope?: "row" | "col" | "rowgroup" | "colgroup";
};
export type TableBlock = { id: string; type: "table"; caption: string; rows: TableCell[][] };
export type UnsupportedBlock = { id: string; type: "unsupported"; label: string; reason: string };
export type ContentBlock = TextBlock | ImageBlock | TableBlock | UnsupportedBlock;
export type Chapter = { id: string; title: string; blocks: ContentBlock[] };
export type Position = {
  chapterId: string;
  blockId: string;
  index: number;
  finished: boolean;
  updatedAt: number;
};

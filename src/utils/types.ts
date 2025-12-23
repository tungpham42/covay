export type Player = "black" | "white";
export type CellValue = Player | null;
export type BoardState = CellValue[][];

export interface MoveResult {
  isValid: boolean;
  message?: string;
  newBoard?: BoardState;
  capturedCount?: number;
  nextKoPos?: string | null; // New field to track Ko
}

export type Player = "black" | "white";
export type CellValue = Player | null;
export type BoardState = CellValue[][];

export interface MoveResult {
  isValid: boolean;
  newBoard?: BoardState;
  message?: string;
  capturedCount?: number;
}

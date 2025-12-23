import React from "react";
import Cell from "./Cell";
import { BoardState } from "../utils/types";
import { BOARD_SIZE } from "../utils/constants";

interface BoardProps {
  board: BoardState;
  lastMove: [number, number] | null;
  onCellClick: (r: number, c: number) => void;
}

const Board: React.FC<BoardProps> = ({ board, lastMove, onCellClick }) => {
  return (
    <div
      className="go-board"
      style={{
        // Dùng grid template để chia ô đều nhau
        gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
      }}
    >
      {board.map((row, r) =>
        row.map((cell, c) => (
          <Cell
            key={`${r}-${c}`}
            r={r}
            c={c}
            value={cell}
            isLastMove={
              lastMove ? lastMove[0] === r && lastMove[1] === c : false
            }
            onClick={() => onCellClick(r, c)}
          />
        ))
      )}
    </div>
  );
};

export default Board;

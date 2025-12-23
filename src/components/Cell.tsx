import React from "react";
import { CellValue } from "../utils/types";
import { STAR_POINTS } from "../utils/constants";

interface CellProps {
  r: number;
  c: number;
  value: CellValue;
  isLastMove: boolean;
  onClick: () => void;
}

// BỎ so sánh custom để fix lỗi "quân cờ biến mất"
const Cell: React.FC<CellProps> = React.memo(
  ({ r, c, value, isLastMove, onClick }) => {
    const isStar = STAR_POINTS.some(([sr, sc]) => sr === r && sc === c);

    return (
      <div className="board-cell" onClick={onClick}>
        <div className="grid-line h"></div>
        <div className="grid-line v"></div>

        {!value && isStar && <div className="hoshi"></div>}

        {value && (
          <div className={`stone ${value}`}>
            {isLastMove && <div className="last-move"></div>}
          </div>
        )}
      </div>
    );
  }
);

export default Cell;

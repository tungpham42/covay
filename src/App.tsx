import React, { useState, useEffect, useCallback } from "react";
import { notification } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import Board from "./components/Board";
import { BOARD_SIZE } from "./utils/constants";
import { BoardState, Player } from "./utils/types";
import { tryPlaceStone, getBestMove } from "./utils/gameLogic";
import "./App.css";

const App: React.FC = () => {
  // --- STATE ---
  const [board, setBoard] = useState<BoardState>(
    Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>("black");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [prisoners, setPrisoners] = useState({ black: 0, white: 0 });

  // --- GAME LOGIC ---
  const handlePlayerMove = (r: number, c: number) => {
    if (isAiThinking || board[r][c] !== null) return;

    const result = tryPlaceStone(r, c, board, "black");
    if (!result.isValid) {
      if (result.message)
        notification.warning({ message: result.message, duration: 2 });
      return;
    }

    if (result.newBoard) {
      setBoard(result.newBoard);
      setLastMove([r, c]);
      setPrisoners((p) => ({
        ...p,
        black: p.black + (result.capturedCount || 0),
      }));
      setCurrentPlayer("white");
      setIsAiThinking(true);
    }
  };

  const processAiTurn = useCallback(() => {
    setTimeout(() => {
      const move = getBestMove(board, "white");
      if (!move) {
        notification.info({ message: "AI Passed / Gave up" });
        setIsAiThinking(false);
        return;
      }
      const [r, c] = move;
      const result = tryPlaceStone(r, c, board, "white");
      if (result.isValid && result.newBoard) {
        setBoard(result.newBoard);
        setLastMove([r, c]);
        setPrisoners((p) => ({
          ...p,
          white: p.white + (result.capturedCount || 0),
        }));
        setCurrentPlayer("black");
      }
      setIsAiThinking(false);
    }, 500);
  }, [board]);

  useEffect(() => {
    if (currentPlayer === "white" && isAiThinking) processAiTurn();
  }, [currentPlayer, isAiThinking, processAiTurn]);

  const resetGame = () => {
    setBoard(
      Array(BOARD_SIZE)
        .fill(null)
        .map(() => Array(BOARD_SIZE).fill(null))
    );
    setCurrentPlayer("black");
    setIsAiThinking(false);
    setLastMove(null);
    setPrisoners({ black: 0, white: 0 });
  };

  // --- RENDER ---
  return (
    <div className="app-layout">
      {/* SIDEBAR / HEADER */}
      <div className="sidebar">
        <h1 className="game-title">Cờ Vây</h1>

        {/* Mobile Mini Status (Chỉ hiện trên mobile) */}
        <div className="mobile-status">
          <span>Bạn: {prisoners.black}</span>
          <span
            style={{ color: currentPlayer === "black" ? "#e74c3c" : "#ccc" }}
          >
            {currentPlayer === "black" ? "Lượt bạn" : "Máy..."}
          </span>
          <span>Máy: {prisoners.white}</span>
        </div>

        {/* Desktop Status Card (Ẩn trên mobile) */}
        <div className="status-card">
          <div className="turn-indicator">
            {currentPlayer === "black"
              ? "Đến lượt bạn"
              : "Máy đang suy nghĩ..."}
          </div>

          <div
            className={`player-row ${
              currentPlayer === "black" ? "active" : ""
            }`}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="avatar av-black">Bạn</div>
              <span>Đen</span>
            </div>
            <strong>{prisoners.black} tù nhân</strong>
          </div>

          <div
            className={`player-row ${
              currentPlayer === "white" ? "active" : ""
            }`}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div className="avatar av-white">Máy</div>
              <span>Trắng</span>
            </div>
            <strong>{prisoners.white} tù nhân</strong>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="controls-wrapper">
          <button className="btn-primary" onClick={resetGame}>
            <ReloadOutlined /> Ván mới
          </button>
        </div>
      </div>

      {/* MAIN BOARD AREA */}
      <div className="board-area">
        <Board
          board={board}
          lastMove={lastMove}
          onCellClick={handlePlayerMove}
        />
      </div>
    </div>
  );
};

export default App;

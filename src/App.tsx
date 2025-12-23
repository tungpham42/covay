import React, { useState, useEffect, useCallback } from "react";
import { notification, Modal } from "antd"; // Import thêm Modal
import {
  ReloadOutlined,
  TrophyOutlined,
  FrownOutlined,
} from "@ant-design/icons";
import Board from "./components/Board";
import { BOARD_SIZE } from "./utils/constants";
import { BoardState, Player } from "./utils/types";
// Đảm bảo bạn đã export hasAnyValidMoves từ gameLogic.ts như hướng dẫn trước
import {
  tryPlaceStone,
  getBestMove,
  hasAnyValidMoves,
} from "./utils/gameLogic";
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
  const [koPos, setKoPos] = useState<string | null>(null);

  // State mới để xác định người thắng
  const [winner, setWinner] = useState<Player | null>(null);

  // --- HELPER: XỬ LÝ KẾT THÚC GAME ---
  const handleGameOver = (winningPlayer: Player) => {
    setWinner(winningPlayer);
    setIsAiThinking(false);

    if (winningPlayer === "black") {
      Modal.success({
        title: "CHIẾN THẮNG!",
        content: "Chúc mừng! Bạn đã chiến thắng máy.",
        icon: <TrophyOutlined style={{ color: "gold" }} />,
        okText: "Chơi ván mới",
        onOk: resetGame,
      });
    } else {
      Modal.error({
        title: "THẤT BẠI",
        content: "Bạn đã hết nước đi hoặc máy đã thắng.",
        icon: <FrownOutlined style={{ color: "red" }} />,
        okText: "Thử lại",
        onOk: resetGame,
      });
    }
  };

  // --- GAME LOGIC ---
  const handlePlayerMove = (r: number, c: number) => {
    // Nếu game đã kết thúc hoặc máy đang nghĩ -> chặn
    if (winner || isAiThinking || board[r][c] !== null) return;

    const result = tryPlaceStone(r, c, board, "black", koPos);

    if (!result.isValid) {
      if (result.message)
        notification.warning({ message: result.message, duration: 2 });
      return;
    }

    if (result.newBoard) {
      const newBoard = result.newBoard;
      const nextKo = result.nextKoPos ?? null;

      setBoard(newBoard);
      setKoPos(nextKo); // Cập nhật Ko cho lượt sau
      setLastMove([r, c]);
      setPrisoners((p) => ({
        ...p,
        black: p.black + (result.capturedCount || 0),
      }));

      // KIỂM TRA THẮNG THUA:
      // Sau khi mình đi, kiểm tra xem Máy (White) còn nước đi nào hợp lệ không?
      const aiCanMove = hasAnyValidMoves(newBoard, "white", nextKo);
      if (!aiCanMove) {
        handleGameOver("black"); // Máy hết đường -> Mình thắng
        return;
      }

      setCurrentPlayer("white");
      setIsAiThinking(true);
    }
  };

  const processAiTurn = useCallback(() => {
    if (winner) return;

    setTimeout(() => {
      // Máy tính toán nước đi
      const move = getBestMove(board, "white", koPos);

      // Trường hợp 1: Máy không tìm thấy nước đi (Đầu hàng)
      if (!move) {
        notification.info({ message: "AI đã đầu hàng!" });
        handleGameOver("black");
        return;
      }

      const [r, c] = move;
      const result = tryPlaceStone(r, c, board, "white", koPos);

      if (result.isValid && result.newBoard) {
        const newBoard = result.newBoard;
        const nextKo = result.nextKoPos ?? null;

        setBoard(newBoard);
        setKoPos(nextKo);
        setLastMove([r, c]);
        setPrisoners((p) => ({
          ...p,
          white: p.white + (result.capturedCount || 0),
        }));

        // KIỂM TRA THẮNG THUA:
        // Sau khi máy đi, kiểm tra xem Bạn (Black) còn nước đi nào hợp lệ không?
        const humanCanMove = hasAnyValidMoves(newBoard, "black", nextKo);
        if (!humanCanMove) {
          handleGameOver("white"); // Bạn hết đường -> Máy thắng
        } else {
          setCurrentPlayer("black");
        }
      } else {
        // Fallback hiếm gặp nếu AI tính sai
        setIsAiThinking(false);
        setCurrentPlayer("black");
      }

      setIsAiThinking(false);
    }, 500);
  }, [board, koPos, winner]); // eslint-disable-line

  useEffect(() => {
    if (currentPlayer === "white" && isAiThinking && !winner) {
      processAiTurn();
    }
  }, [currentPlayer, isAiThinking, processAiTurn, winner]);

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
    setKoPos(null);
    setWinner(null);
  };

  // --- RENDER ---
  return (
    <div className="app-layout">
      {/* SIDEBAR / HEADER */}
      <div className="sidebar">
        <h1 className="game-title">Cờ Vây</h1>

        {/* Mobile Mini Status */}
        <div className="mobile-status">
          <span>Bạn: {prisoners.black}</span>
          <span
            style={{
              color: winner
                ? "gold"
                : currentPlayer === "black"
                ? "#e74c3c"
                : "#ccc",
              fontWeight: "bold",
            }}
          >
            {winner
              ? "KẾT THÚC"
              : currentPlayer === "black"
              ? "Lượt bạn"
              : "Máy..."}
          </span>
          <span>Máy: {prisoners.white}</span>
        </div>

        {/* Desktop Status Card */}
        <div className="status-card">
          <div className="turn-indicator">
            {winner
              ? winner === "black"
                ? "BẠN THẮNG!"
                : "MÁY THẮNG!"
              : currentPlayer === "black"
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

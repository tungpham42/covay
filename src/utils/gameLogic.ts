import { BOARD_SIZE, STAR_POINTS } from "./constants";
import { BoardState, Player, MoveResult } from "./types";

// --- CÁC HÀM CƠ BẢN (Giữ nguyên) ---

const isValidPos = (r: number, c: number) =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

const getNeighbors = (r: number, c: number) => {
  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  return directions
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => isValidPos(nr, nc));
};

const getGroupAndLiberties = (r: number, c: number, board: BoardState) => {
  const color = board[r][c];
  if (!color) return { group: [], liberties: 0 };

  const group: string[] = [`${r}-${c}`];
  const liberties = new Set<string>();
  const queue = [[r, c]];
  const visited = new Set<string>([`${r}-${c}`]);

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const neighbors = getNeighbors(cr, cc);

    for (const [nr, nc] of neighbors) {
      if (board[nr][nc] === null) {
        liberties.add(`${nr}-${nc}`);
      } else if (board[nr][nc] === color && !visited.has(`${nr}-${nc}`)) {
        visited.add(`${nr}-${nc}`);
        queue.push([nr, nc]);
        group.push(`${nr}-${nc}`);
      }
    }
  }

  return { group, liberties: liberties.size };
};

// --- LOGIC XỬ LÝ NƯỚC ĐI (Giữ nguyên logic, tối ưu return) ---

export const tryPlaceStone = (
  r: number,
  c: number,
  board: BoardState,
  currentPlayer: Player
): MoveResult => {
  if (board[r][c] !== null) return { isValid: false };

  // Tạo bản sao sâu (Deep copy) để không ảnh hưởng bàn cờ thật
  const nextBoard = board.map((row) => [...row]);
  nextBoard[r][c] = currentPlayer;

  const opponent = currentPlayer === "black" ? "white" : "black";
  const neighbors = getNeighbors(r, c);
  let capturedStones: string[] = [];

  // Kiểm tra bắt quân đối phương
  neighbors.forEach(([nr, nc]) => {
    if (nextBoard[nr][nc] === opponent) {
      const { group, liberties } = getGroupAndLiberties(nr, nc, nextBoard);
      if (liberties === 0) {
        capturedStones = [...capturedStones, ...group];
      }
    }
  });

  // Loại bỏ quân bị bắt
  capturedStones.forEach((pos) => {
    const [cr, cc] = pos.split("-").map(Number);
    nextBoard[cr][cc] = null;
  });

  // Kiểm tra tự sát
  const myGroupInfo = getGroupAndLiberties(r, c, nextBoard);
  if (myGroupInfo.liberties === 0 && capturedStones.length === 0) {
    return { isValid: false, message: "Nước đi tự sát không hợp lệ!" };
  }

  return {
    isValid: true,
    newBoard: nextBoard,
    capturedCount: capturedStones.length,
  };
};

// --- AI ENGINE (HEURISTIC) ---

// Hàm tính điểm cho một nước đi
const evaluateMove = (
  r: number,
  c: number,
  board: BoardState,
  player: Player
): number => {
  const result = tryPlaceStone(r, c, board, player);
  if (!result.isValid || !result.newBoard) return -Infinity; // Nước đi lỗi

  let score = 0;
  const opponent = player === "black" ? "white" : "black";

  // 1. ƯU TIÊN CAO NHẤT: Ăn quân (Capture)
  if (result.capturedCount && result.capturedCount > 0) {
    score += 1000 * result.capturedCount;
  }

  // 2. ƯU TIÊN CAO: Thoát hiểm (Atari Defense)
  // Nếu nước đi này giúp nhóm quân của mình tăng khí, tránh bị ăn
  // Logic này hơi phức tạp để tính nhanh, ta sẽ dùng cách đơn giản:
  // Kiểm tra số khí của quân vừa đặt.
  const myGroup = getGroupAndLiberties(r, c, result.newBoard);
  if (myGroup.liberties === 1) {
    score -= 200; // Tự đưa mình vào thế Atari (nguy hiểm) -> Trừ điểm
  } else {
    score += myGroup.liberties * 10; // Càng nhiều khí càng tốt
  }

  // 3. TẤN CÔNG: Dọa bắt (Atari Attack)
  // Kiểm tra các nhóm quân địch lân cận, nếu nhóm nào còn 1 khí -> Cộng điểm
  const neighbors = getNeighbors(r, c);
  neighbors.forEach(([nr, nc]) => {
    if (result.newBoard![nr][nc] === opponent) {
      const enemyGroup = getGroupAndLiberties(nr, nc, result.newBoard!);
      if (enemyGroup.liberties === 1) {
        score += 300; // Đưa địch vào thế Atari
      }
    }
  });

  // 4. CHIẾN THUẬT: Điểm sao (Star Points) - quan trọng lúc khai cuộc
  const isStar = STAR_POINTS.some(([sr, sc]) => sr === r && sc === c);
  if (isStar) score += 50;

  // 5. ĐỊA LỢI: Đánh gần quân mình hoặc gần trung tâm (tránh đánh biên vô nghĩa)
  // Khoảng cách tới trung tâm
  const center = Math.floor(BOARD_SIZE / 2);
  const distToCenter = Math.abs(r - center) + Math.abs(c - center);
  score -= distToCenter; // Càng gần trung tâm càng ít bị trừ điểm

  // Random nhẹ để máy không đánh rập khuôn 100%
  score += Math.random() * 5;

  return score;
};

// Hàm tìm nước đi tốt nhất thay cho getRandomMove
export const getBestMove = (
  board: BoardState,
  player: Player
): [number, number] | null => {
  let bestScore = -Infinity;
  let bestMoves: [number, number][] = [];

  // Duyệt qua tất cả các ô trống
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        const score = evaluateMove(r, c, board, player);

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [[r, c]];
        } else if (score === bestScore) {
          bestMoves.push([r, c]);
        }
      }
    }
  }

  if (bestMoves.length === 0) return null; // Hết nước hoặc đầu hàng

  // Chọn ngẫu nhiên 1 trong các nước tốt nhất (nếu điểm bằng nhau)
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

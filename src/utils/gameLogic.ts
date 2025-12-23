import { BOARD_SIZE, STAR_POINTS } from "./constants";
import { BoardState, Player, MoveResult } from "./types";

// --- CÁC HÀM CƠ BẢN ---

const isValidPos = (r: number, c: number) =>
  r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

// Lấy danh sách các ô liền kề (trên, dưới, trái, phải)
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

/**
 * Hàm đếm "Khí" (Liberties) của một nhóm quân.
 * - Trả về danh sách các quân trong nhóm.
 * - Trả về số lượng khí (giao điểm trống bao quanh).
 */
const getGroupAndLiberties = (r: number, c: number, board: BoardState) => {
  const color = board[r][c];
  if (!color) return { group: [], liberties: 0 };

  const group: string[] = [`${r}-${c}`];
  const liberties = new Set<string>(); // Dùng Set để đếm khí không trùng lặp
  const queue = [[r, c]];
  const visited = new Set<string>([`${r}-${c}`]);

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const neighbors = getNeighbors(cr, cc);

    for (const [nr, nc] of neighbors) {
      if (board[nr][nc] === null) {
        // Giao điểm trống -> Là "Khí"
        liberties.add(`${nr}-${nc}`);
      } else if (board[nr][nc] === color && !visited.has(`${nr}-${nc}`)) {
        // Quân cùng màu -> Thuộc cùng một nhóm -> Duyệt tiếp
        visited.add(`${nr}-${nc}`);
        queue.push([nr, nc]);
        group.push(`${nr}-${nc}`);
      }
    }
  }

  return { group, liberties: liberties.size };
};

// --- LOGIC XỬ LÝ NƯỚC ĐI (LUẬT CHÍNH) ---

export const tryPlaceStone = (
  r: number,
  c: number,
  board: BoardState,
  currentPlayer: Player,
  koForbiddenPos: string | null = null
): MoveResult & { nextKoPos?: string | null } => {
  // 1. Kiểm tra cơ bản: Ô phải trống
  if (board[r][c] !== null) return { isValid: false };

  // 2. Kiểm tra Luật Ko (Cấm lặp lại trạng thái cũ ngay lập tức)
  if (koForbiddenPos === `${r}-${c}`) {
    return {
      isValid: false,
      message: "Phạm luật Ko! Không được đánh lại vị trí cũ ngay lập tức.",
    };
  }

  // Tạo bản sao bàn cờ để thử nghiệm nước đi
  const nextBoard = board.map((row) => [...row]);
  nextBoard[r][c] = currentPlayer;

  const opponent = currentPlayer === "black" ? "white" : "black";
  const neighbors = getNeighbors(r, c);
  let capturedStones: string[] = [];

  // 3. XỬ LÝ BẮT QUÂN (Luật: Kiểm tra địch hết khí trước)
  neighbors.forEach(([nr, nc]) => {
    if (nextBoard[nr][nc] === opponent) {
      const { group, liberties } = getGroupAndLiberties(nr, nc, nextBoard);
      // Nếu nhóm quân địch hết khí -> Bắt
      if (liberties === 0) {
        capturedStones = [...capturedStones, ...group];
      }
    }
  });

  // Loại bỏ quân bị bắt khỏi bàn cờ (Tạo ra "đất" và "khí" mới)
  capturedStones.forEach((pos) => {
    const [cr, cc] = pos.split("-").map(Number);
    nextBoard[cr][cc] = null;
  });

  // 4. XỬ LÝ LUẬT TỰ SÁT (Quan trọng)
  // Quy tắc: "Không được đặt quân vào vị trí hết khí... trừ khi bắt được quân đối phương"
  // Logic: Ta kiểm tra khí của quân mình SAU KHI đã loại bỏ quân địch bị bắt.
  const myGroupInfo = getGroupAndLiberties(r, c, nextBoard);

  // Nếu sau khi dọn dẹp mà nhóm mình vẫn 0 khí -> Chắc chắn là Tự Sát
  if (myGroupInfo.liberties === 0) {
    return {
      isValid: false,
      message: "Nước đi Tự Sát! Vị trí này không còn khí.",
    };
  }

  // 5. Tính toán vị trí Ko cho lượt sau (Next Ko Position)
  // Ko xảy ra khi: Ăn đúng 1 quân và quân mình cũng chỉ còn 1 khí (thế tranh chấp 1-1)
  let nextKoPos: string | null = null;
  if (capturedStones.length === 1 && myGroupInfo.liberties === 1) {
    nextKoPos = capturedStones[0];
  }

  // Trả về kết quả hợp lệ
  return {
    isValid: true,
    newBoard: nextBoard,
    capturedCount: capturedStones.length,
    nextKoPos: nextKoPos,
  };
};

// --- AI ENGINE (Đơn giản hóa cho đúng luật) ---

const evaluateMove = (
  r: number,
  c: number,
  board: BoardState,
  player: Player,
  koForbiddenPos: string | null
): number => {
  // AI thử đi, nếu hàm tryPlaceStone trả về False (do Tự sát hoặc Ko) -> Bỏ qua
  const result = tryPlaceStone(r, c, board, player, koForbiddenPos);
  if (!result.isValid || !result.newBoard) return -Infinity;

  let score = 0;

  // Ưu tiên 1: Ăn quân (Rất tốt)
  if (result.capturedCount && result.capturedCount > 0) {
    score += 1000 * result.capturedCount;
  }

  // Ưu tiên 2: Khí (Càng nhiều khí càng sống dai)
  const myGroup = getGroupAndLiberties(r, c, result.newBoard);
  if (myGroup.liberties === 1) {
    score -= 200; // Nguy hiểm: Sắp bị bắt (Atari)
  } else {
    score += myGroup.liberties * 10;
  }

  // Ưu tiên 3: Vị trí sao (Star points)
  const isStar = STAR_POINTS.some(([sr, sc]) => sr === r && sc === c);
  if (isStar) score += 50;

  // Ưu tiên 4: Gần trung tâm
  const center = Math.floor(BOARD_SIZE / 2);
  score -= Math.abs(r - center) + Math.abs(c - center);

  // Random nhẹ để bớt máy móc
  score += Math.random() * 5;

  return score;
};

export const getBestMove = (
  board: BoardState,
  player: Player,
  koForbiddenPos: string | null = null
): [number, number] | null => {
  // ... (Giữ nguyên logic cũ) ...
  let bestScore = -Infinity;
  let bestMoves: [number, number][] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) {
        const score = evaluateMove(r, c, board, player, koForbiddenPos);

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [[r, c]];
        } else if (score === bestScore) {
          bestMoves.push([r, c]);
        }
      }
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

// --- THÊM HÀM MỚI NÀY VÀO CUỐI FILE ---

/**
 * Kiểm tra xem người chơi (player) còn nước đi hợp lệ nào không.
 * Nếu trả về false -> Người chơi đó thua (hoặc phải bỏ lượt).
 */
export const hasAnyValidMoves = (
  board: BoardState,
  player: Player,
  koForbiddenPos: string | null
): boolean => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Chỉ cần tìm thấy 1 ô trống đi được là return true ngay
      if (board[r][c] === null) {
        const result = tryPlaceStone(r, c, board, player, koForbiddenPos);
        if (result.isValid) {
          return true;
        }
      }
    }
  }
  return false;
};

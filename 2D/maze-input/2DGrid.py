import os
import random
import sys
from collections import deque

# Windows hay dùng bảng mã cũ (cp1252) nên in tiếng Việt bị lỗi; ép về UTF-8
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# ---- Tham số dễ chỉnh ----
EPISODES_MIN = 200        # số episode tối thiểu
EPISODES_PER_CELL = 20    # lưới lớn thì cần thêm episode: episodes = max(MIN, PER_CELL * rows * cols)
STEPS_FACTOR = 4          # giới hạn bước mỗi episode = STEPS_FACTOR * rows * cols
alpha = 0.5
gamma = 0.9
EPSILON = 0.7
SEED = 42                 # đặt None để mỗi lần chạy ra kết quả khác nhau

DEFAULT_MAZE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maze.txt")


class Grid2D:
    def __init__(self, rows, cols, walls, traps):
        self.rows = rows
        self.cols = cols
        self.walls = walls
        self.traps = traps

    def reset(self):
        self.pos = (0,0)
        return self.pos


    def step(self, action):
        x,y = self.pos
        if action == 1: #go right
          y+=1
        elif action == 2: #go up
          x-=1
        elif action == 3: #go down
          x+=1
        else:
          y -= 1
        x = max(x, 0)
        y = max(y,0)
        x = min(self.rows - 1, x)
        y = min(self.cols - 1, y)

        if (x,y) not in self.walls:
          self.pos = (x,y)
        done = self.pos == (self.rows-1, self.cols-1)
        if done:
          reward = 10
        elif self.pos in self.traps:
          reward = -10
        else:
          reward = -1

        return (self.pos, reward, done)


# ---- Đọc và kiểm tra bản đồ chữ ----
def parse_maze(lines):
    """Nhận danh sách dòng, trả về rows, cols, walls, traps. S và G coi như ô trống."""
    while lines and not lines[-1].strip():   # bỏ dòng trống thừa ở cuối file
        lines = lines[:-1]
    if not lines:
        raise ValueError("File bản đồ rỗng.")
    rows, cols = len(lines), len(lines[0])
    walls, traps = set(), set()
    for r, line in enumerate(lines):
        if len(line) != cols:
            raise ValueError(f"Dòng {r + 1} dài {len(line)} ký tự, nhưng dòng 1 dài {cols}. Các dòng phải cùng độ dài.")
        for c, ch in enumerate(line):
            if ch not in ".#TSG":
                raise ValueError(f"Ký tự lạ {ch!r} ở dòng {r + 1}, cột {c + 1}. Chỉ chấp nhận . # T S G")
            if ch == "#":
                walls.add((r, c))
            elif ch == "T":
                traps.add((r, c))
            elif ch == "S" and (r, c) != (0, 0):
                raise ValueError(f"S phải ở góc trên trái (0,0), nhưng đang ở ({r},{c}).")
            elif ch == "G" and (r, c) != (rows - 1, cols - 1):
                raise ValueError(f"G phải ở góc dưới phải ({rows - 1},{cols - 1}), nhưng đang ở ({r},{c}).")
    if rows * cols < 2:
        raise ValueError("Lưới chỉ có 1 ô: start trùng goal.")
    goal = (rows - 1, cols - 1)
    if (0, 0) in walls or (0, 0) in traps:
        raise ValueError("Start (0,0) không được là tường hoặc bẫy.")
    if goal in walls or goal in traps:
        raise ValueError(f"Goal {goal} không được là tường hoặc bẫy.")
    if not has_path(rows, cols, walls):
        raise ValueError("Không có đường đi từ start tới goal (bị tường chặn kín).")
    return rows, cols, walls, traps


def has_path(rows, cols, walls):
    """BFS: có đường từ (0,0) tới goal không (bẫy đi xuyên qua được nên chỉ chặn bởi tường)."""
    goal = (rows - 1, cols - 1)
    seen = {(0, 0)}
    queue = deque([(0, 0)])
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:
            return True
        for nr, nc in ((r, c - 1), (r, c + 1), (r - 1, c), (r + 1, c)):
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in walls and (nr, nc) not in seen:
                seen.add((nr, nc))
                queue.append((nr, nc))
    return False


def load_maze(filename):
    with open(filename, encoding="utf-8-sig") as f:   # utf-8-sig: bỏ BOM nếu có
        return parse_maze(f.read().splitlines())      # splitlines xử lý được cả \r\n


# ---- Tạo env từ file, rồi mới tạo Q_table ----
random.seed(SEED)
filename = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MAZE
try:
    rows, cols, walls, traps = load_maze(filename)
except (ValueError, OSError) as e:
    sys.exit(f"Lỗi bản đồ '{filename}': {e}")

env = Grid2D(rows, cols, walls, traps)
max_steps = STEPS_FACTOR * env.rows * env.cols
episodes = max(EPISODES_MIN, EPISODES_PER_CELL * env.rows * env.cols)

Q_table = {}
for row in range(env.rows):
    for col in range(env.cols):
        Q_table[row,col] = [0] * 4

def choose_action(r_state, c_state, epsilon):
  if random.random()< epsilon:
    return  random.randint(0,3)
  else:
    best = max(Q_table[r_state,c_state])
    return Q_table[r_state, c_state].index(best)


def update_q(r_state, c_state, action, reward, next_r_state, next_c_state, done):
  if done:
    target = reward
  else:
    target = reward + gamma *(max(Q_table[next_r_state, next_c_state]))
  Q_table[r_state,c_state][action] = Q_table[r_state, c_state][action] + alpha*(target - Q_table[r_state, c_state][action])


def run_greedy():
    r_state, c_state = env.reset()
    done = False
    path = [(0,0)]
    steps = 0
    total_reward = 0
    while not done and steps < max_steps:
        action = choose_action(r_state, c_state, 0)
        (r_state, c_state), reward, done = env.step(action)
        path.append((r_state, c_state))
        total_reward += reward
        steps += 1
    return path, steps, total_reward, done


def print_policy():
    """In lưới policy. Thứ tự mũi tên khớp action: 0=trái, 1=phải, 2=lên, 3=xuống."""
    arrows = ["<-", "->", "^ ", "v "]
    for r in range(env.rows):
        cells = []
        for c in range(env.cols):
            if (r, c) in env.walls:
                cells.append("# ")
            elif (r, c) in env.traps:
                cells.append("T ")
            elif (r, c) == (env.rows - 1, env.cols - 1):
                cells.append("G ")
            else:
                q = Q_table[r, c]
                cells.append(arrows[q.index(max(q))])
        print(" ".join(cells))


print(f"Bản đồ {env.rows}x{env.cols}, {len(env.walls)} tường, {len(env.traps)} bẫy; "
      f"train {episodes} episode, tối đa {max_steps} bước/episode.")

for episode in range(episodes):
    r_state, c_state = env.reset()
    done = False
    steps = 0
    while not done and steps < max_steps:
      action = choose_action(r_state,c_state, EPSILON)
      (next_r_state, next_c_state), reward, done = env.step(action)
      update_q(r_state, c_state, action, reward, next_r_state, next_c_state, done)
      r_state, c_state = next_r_state, next_c_state
      steps += 1
    if episode < 8:
        path, steps, total_reward, reached = run_greedy()
        print(episode + 1, path, steps, [round(q, 2) for q in Q_table[(0, 0)]])

path, steps, total_reward, reached = run_greedy()
print("\nĐường đi greedy cuối cùng:", path)
print(f"Số bước: {steps}, tổng reward: {total_reward}", "" if reached else "(CHƯA tới đích - cần thêm episode)")
print("\nPolicy:")
print_policy()

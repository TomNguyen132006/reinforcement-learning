import random


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
      
      

      
env = Grid2D(3,3,{(1,2)},{(1,1)})
alpha = 0.5
gamma = 0.9

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
    while not done and steps < 50:
        action = choose_action(r_state, c_state, 0)   
        (r_state, c_state), reward, done = env.step(action)
        path.append((r_state, c_state))
        steps += 1
    return path, steps   

for episode in range(200):   
    path = [(0,0)]     
    r_state, c_state = env.reset()         
    done = False
    while not done:                      
      action = choose_action(r_state,c_state, 0.7)             
      (next_r_state, next_c_state), reward, done = env.step(action)
      update_q(r_state, c_state, action, reward, next_r_state, next_c_state, done)
      r_state, c_state = next_r_state, next_c_state
    if episode < 8:                             
        path, steps = run_greedy()                       
        print(episode + 1, path, steps, [round(q, 2) for q in Q_table[(0, 0)]])


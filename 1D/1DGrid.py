import random


class Grid1D:
    def __init__(self, n):
        self.n = n

    def reset(self):
        self.pos = 0
        return self.pos
  

    def step(self, action):
        if action == 1:
          self.pos += 1
        else:
          self.pos -= 1
        self.pos = max(self.pos, 0)
        self.pos = min(self.n - 1, self.pos)
        
        done = self.pos == self.n -1
        if done:
          reward = 10
        else:
          reward = -1
        
        return (self.pos, reward, done)
      
      

      
env = Grid1D(5)
alpha = 0.5
gamma = 0.9

Q_table = [[0] * 2 for _ in range(env.n)]


def choose_action(state, epsilon):
  if random.random()< epsilon:
    return  random.randint(0,1)
  else:
    best = max(Q_table[state])        
    return Q_table[state].index(best)
  
  
def update_q(state, action, reward, next_state, done):
  if done:
    target = reward
  else:
    target = reward + gamma *(max(Q_table[next_state]))
  Q_table[state][action] = Q_table[state][action] + alpha*(target - Q_table[state][action])
                    
                    
def run_greedy():
    state = env.reset()                    
    done = False
    path = [0]                   
    steps = 0
    while not done and steps < 50:
        action = choose_action(state, 0)   
        state, reward, done = env.step(action)
        path.append(state)
        steps += 1
    return path, steps   

for episode in range(200):   
    path = [0]     
    state = env.reset()          
    done = False
    while not done:                      
      action = choose_action(state, 0.7)             
      next_state, reward, done = env.step(action)
      update_q(state, action, reward, next_state, done)
      state = next_state
    if episode < 8:                             
        path, steps = run_greedy()                       
        print(episode + 1, path, steps, [round(Q_table[i][1], 2) for i in range(4)])


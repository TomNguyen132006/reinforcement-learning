"""Runs the REAL 2DGrid.py code with random.seed(1) and records what the film shows -> numbers.json + out/2DGrid_seed1_output.txt"""
import random, json, os, io, contextlib, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '2DGrid.py'), encoding='utf-8').read()
head, loop = src.split('for episode in range(200):')
random.seed(1)
class Spy:                                   # flags a step as random exploration without touching the RNG stream
    hit = 0
    def seed(s, *a): random.seed(*a)
    def random(s): return random.random()
    def randint(s, a, b): s.hit = 1; return random.randint(a, b)
spy = Spy()
g = {}
exec(head.replace('import random', 'random = __spy__', 1) if False else head, g)
g['random'] = spy
env, Q, choose_action, update_q, run_greedy = g['env'], g['Q_table'], g['choose_action'], g['update_q'], g['run_greedy']
snap = lambda: [[round(q, 2) for q in Q[r, c]] for r in range(3) for c in range(3)]   # row-major cells, [left,right,up,down]
out = {'train': {}, 'test': [], 'table': {}, 'walls': sorted(map(list, env.walls)), 'traps': sorted(map(list, env.traps))}
for ep in range(200):
    s = env.reset(); done = False; steps = []
    while not done:
        spy.hit = 0; a = choose_action(s[0], s[1], 0.7)
        ns, r, done = env.step(a)
        update_q(s[0], s[1], a, r, ns[0], ns[1], done)
        steps.append({'s': list(s), 'a': a, 'n': list(ns), 'r': spy.hit, 'rw': r})
        s = ns
    if ep < 8:
        path, n = run_greedy()
        out['test'].append({'ep': ep + 1, 'steps': n, 'path': [list(p) for p in path]})
        out['table'][str(ep + 1)] = snap()
        if ep < 2: out['train'][str(ep + 1)] = steps
out['final'] = snap()
json.dump(out, open(os.path.join(HERE, 'numbers.json'), 'w'), indent=1)
print({k: len(v) for k, v in out['train'].items()}, [(t['ep'], t['steps']) for t in out['test']])
print(out['train']['1'][-1], out['train']['2'][-1]); print(out['final'])

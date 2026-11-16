"""Build the Case File 001 soundtrack: tightened voice + EQ/compression + deep reverb + synthesized SFX.
Also writes warp.json, which maps output time -> animation time so every scene lands on its voice line.

Run: python3 -I build_audio.py   (from this folder)
"""
import json, os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
TEMPO = 1.06                  # slight speed-up of the voice
rng = np.random.default_rng(7)

# speech segments of voice-raw.mp3 found with silencedetect (-38 dB, 0.18 s)
SIL = [1.10937,1.38134,2.34791,3.04633,4.06789,4.40821,5.2471,5.8534,6.54712,6.96388,8.74837,9.08159,9.51052,10.0136,
       12.3864,12.8468,15.3238,15.6504,16.7061,16.9666,17.6629,18.3471,19.0957,19.5557,22.1512,22.5294,23.2702,23.6048,
       26.5373,27.1762,27.5145,27.7893,29.4825,29.8696,30.6679,31.3074,32.023,32.4368,33.2344,33.5522,34.4635,34.8003,
       35.6919,36.8317,37.6376,38.0551,38.8917,39.2535,40.9747,41.4585,43.6429,43.9573,45.0622,45.4904,45.9432,46.3032,
       46.6895,46.9502,47.4665,47.7257]
bounds = [0.0] + SIL
SEGS = [(bounds[i*2], bounds[i*2+1]) for i in range(30)]   # 30 phrases

# script line groups: (segment ids, animation start, animation end, gap between its phrases)
GROUPS = [
    ([0,1],      0.0,  1.2, .12),   # Same house. Same street.
    ([2],        1.2,  2.45, 0),    # The owner is broke.
    ([3],        2.45, 4.75, 0),    # The renter isn't.
    ('T', 4.75, 7.2, 1.25),
    ([4,5,6],    7.2, 11.0, .2),    # Meet the renter. He pays... That's it.
    ([7],       11.0, 14.0, 0),     # Pipe breaks? The landlord pays.
    ([8,9,10],  14.0, 18.7, .16),   # Every month he invests... S&P 500. No skipping.
    ('T', 18.7, 19.1, .45),
    ([11],      19.1, 20.9, 0),     # Now the owner.
    ([12],      20.9, 24.0, 0),     # Fifty-two thousand down...
    ([13,14],   24.0, 28.0, .2),    # Then the bills. Mortgage. Taxes. Insurance. Repairs.
    ([15,16,17],28.0, 31.0, .14),   # Over a thousand more than rent. Every month.
    ([18,19],   31.0, 34.0, .18),   # Year four. The roof goes.
    ([20,21],   34.0, 36.4, .18),   # No cash left. It goes on a card.
    ('T', 36.4, 37.2, .55),
    ([22,23],   37.2, 40.0, .18),   # Ten years later? Almost a tie.
    ([24],      40.0, 43.0, 0),     # But only one of them can touch his money.
    ([25,26],   43.0, 45.85, .16),  # Stay twenty years, and the owner wins. Rent keeps going up.
    ('T', 45.85, 46.1, .3),
    ([27,28,29],46.1, 48.5, .1),    # So, rent or own?
]
MAX_SPEED, LEAD, TAIL = 1.8, .05, .22

def run(*a): subprocess.run(a, check=True)
def load(path, extra=()):
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,*extra,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def save(path, x):
    x = np.asarray(x, dtype=np.float32); ch = 1 if x.ndim == 1 else x.shape[0]
    data = x if ch == 1 else x.T.reshape(-1)
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac',str(ch),'-i','-',path],input=data.tobytes(),check=True)

# ---------- 1. voice timeline ----------
voice_src = load(os.path.join(HERE,'voice-raw.mp3'), ['-af', f'atempo={TEMPO}'])
def seg(i):
    a, b = SEGS[i]; a = max(0, a/TEMPO - .04); b = b/TEMPO + .05
    s = voice_src[int(a*SR):int(b*SR)].copy(); f = int(.008*SR)
    s[:f] *= np.linspace(0,1,f); s[-f:] *= np.linspace(1,0,f); return s

anchors, events_voice, t_out = [[0.0, 0.0]], [], 0.0
for g in GROUPS:
    if g[0] == 'T':
        _, v0, v1, d = g; t_out += d; anchors.append([round(t_out,4), v1]); continue
    ids, v0, v1, gap = g
    clips = [seg(i) for i in ids]
    vdur = sum(len(c) for c in clips)/SR + gap*(len(ids)-1)
    lead = 0 if v0 == 0 else LEAD
    out = max(lead + vdur + TAIL, (v1-v0)/MAX_SPEED)
    if ids[0] == 27: out = max(out, lead + vdur + .9)       # hold the last line, let the reverb ring
    pos = t_out + lead
    for c in clips: events_voice.append((pos, c)); pos += len(c)/SR + gap
    t_out += out; anchors.append([round(t_out,4), v1])
TOTAL = t_out
json.dump(anchors, open(os.path.join(HERE,'warp.json'),'w'))
vt = np.array([a[1] for a in anchors]); ot = np.array([a[0] for a in anchors])
v2o = lambda v: float(np.interp(v, vt, ot))

voice = np.zeros(int((TOTAL+1)*SR), np.float32)
for pos, c in events_voice: i = int(pos*SR); voice[i:i+len(c)] += c
save(os.path.join(HERE,'voice_dry.wav'), voice)

# ---------- 2. EQ + compression (ffmpeg) ----------
run('ffmpeg','-v','error','-y','-i',os.path.join(HERE,'voice_dry.wav'),'-af',
    'highpass=f=70,equalizer=f=110:t=o:w=1:g=3.5,equalizer=f=350:t=o:w=1:g=-2,equalizer=f=3200:t=o:w=1.2:g=2.5,'
    'acompressor=threshold=0.08:ratio=3.5:attack=4:release=90:makeup=2.2,alimiter=limit=0.9',
    os.path.join(HERE,'voice_eq.wav'))
voice_eq = load(os.path.join(HERE,'voice_eq.wav'))

# ---------- 3. deep hall reverb (synthetic impulse response, stereo) ----------
def make_ir(rt60=2.6, predelay=.028, dark=.9):
    n = int(rt60*SR); t = np.arange(n)/SR; ir = np.zeros((2, n+int(predelay*SR)), np.float32)
    for ch in range(2):
        x = rng.standard_normal(n) * np.exp(-6.9*t/rt60)
        y = np.empty(n); lp = 0.0                              # darker as it decays
        a = 1 - np.exp(-2*np.pi*np.linspace(9000, 1800, n)/SR)
        for k in range(n): lp += a[k]*(x[k]-lp); y[k] = lp
        y[:int(.012*SR)] *= np.linspace(0,1,int(.012*SR))
        ir[ch, int(predelay*SR):] = y
    return ir / np.sqrt((ir**2).sum()/2)
def convolve(x, ir):
    n = len(x)+ir.shape[1]; N = 1<<(n-1).bit_length(); X = np.fft.rfft(x, N)
    return np.stack([np.fft.irfft(X*np.fft.rfft(ir[c], N), N)[:len(x)] for c in range(2)])
IR = make_ir()
wet = convolve(voice_eq, IR)
voice_st = np.stack([voice_eq, voice_eq]) + .30*wet/np.max(np.abs(wet))*np.max(np.abs(voice_eq))

# ---------- 4. synthesized sound effects ----------
def env(n, a, r): e = np.ones(n); ai, ri = int(a*SR), int(r*SR); e[:ai] = np.linspace(0,1,ai) if ai else 1; e[-ri:] *= np.exp(-np.linspace(0,6,ri)) if ri else 1; return e
def svf(x, fc, q=.7):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape); y = np.empty_like(x); lo = bp = 0.0
    for k in range(len(x)):
        f = 2*np.sin(np.pi*min(fc[k], SR/6)/SR); hi = x[k]-lo-q*bp; bp += f*hi; lo += f*bp; y[k] = bp
    return y
def whoosh(d=.7, f0=300, f1=3200, peak=.6):
    n = int(d*SR); t = np.linspace(0,1,n); fc = f0*(f1/f0)**np.sin(t*np.pi/2*1.0)
    e = np.where(t<peak, (t/peak)**2, np.exp(-(t-peak)/(1-peak)*5)); return svf(rng.standard_normal(n), fc, .5)*e*.9
def boom(d=1.4, f0=110, f1=38):
    n = int(d*SR); t = np.arange(n)/SR; ph = 2*np.pi*np.cumsum(f1+(f0-f1)*np.exp(-t*7))/SR
    body = np.sin(ph)*np.exp(-t*3.2); click = svf(rng.standard_normal(n), 2500, .9)*np.exp(-t*60)*.5
    return np.tanh((body*1.3+click)*1.4)*.9
def riser(d=1.3, f0=250, f1=5000):
    n = int(d*SR); t = np.linspace(0,1,n); x = svf(rng.standard_normal(n), f0*(f1/f0)**t, .35)*t**1.6
    tone = np.sin(2*np.pi*np.cumsum(400*(4)**t)/SR)*t**2*.15; return (x*.8+tone)
def shimmer(d=1.2):
    n = int(d*SR); t = np.arange(n)/SR; x = np.zeros(n)
    for f in (1318.5, 1760, 2637, 3520): x += np.sin(2*np.pi*f*t + rng.uniform(0,6))*(.5+.5*np.sin(2*np.pi*(6+rng.uniform(0,3))*t))
    return x*np.sin(np.pi*t/d)**1.5*.12
def pop(f0=900, f1=320, d=.09):
    n = int(d*SR); t = np.arange(n)/SR; return np.sin(2*np.pi*np.cumsum(f1+(f0-f1)*np.exp(-t*60))/SR)*np.exp(-t*38)*.7
def ding(f=1975.5, d=1.1):
    n = int(d*SR); t = np.arange(n)/SR
    return (np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6)+.3*np.sin(2*np.pi*f*1.5*t))*np.exp(-t*4.5)*.32
def coin(): return np.concatenate([ding(1975.5,.12)*.8, ding(2637,1.0)])
def tick(): n = int(.02*SR); return svf(rng.standard_normal(n), 4000, .6)*np.exp(-np.arange(n)/SR*300)*.8
def swipe(d=.28): return whoosh(d, 1500, 7000, .35)*.7
def thunder(d=3.0):
    n = int(d*SR); t = np.arange(n)/SR; x = svf(rng.standard_normal(n), 140+300*np.exp(-t*2), .8)
    crack = svf(rng.standard_normal(n), 3000, .8)*np.exp(-t*14)*.6
    return np.tanh((x*np.exp(-t*1.1)*(1+.6*np.sin(2*np.pi*3*t)) + crack)*2)*.8
def beep():
    n = int(.11*SR); t = np.arange(n)/SR; b = np.sign(np.sin(2*np.pi*1046*t))*.25*np.exp(-t*8)
    return np.concatenate([b, np.zeros(int(.07*SR)), b])
def splash():
    n = int(.8*SR); b = np.zeros(n); bb = boom(.6, 140, 70); b[:len(bb)] = bb
    return svf(rng.standard_normal(n), 2200, .4)*env(n, .01, .7)*.7 + b*.4
def clunk():
    b = boom(.35, 260, 120)*.7; k = tick(); b[:len(k)] += k; return b

# (animation time, sound, gain)
FX = [
 (0.0,boom(),.75),(0.0,shimmer(1.5),.6),
 (1.05,whoosh(.55),.55),(1.55,whoosh(.4,2500,400,.2),.4),(1.95,boom(),.95),(2.0,tick(),.6),
 (2.45,shimmer(1.4),.8),(2.45,riser(1.2),.35),(3.55,pop(),.6),(3.67,pop(1000),.6),(3.79,pop(1100),.6),(3.85,coin(),.8),
 (4.75,whoosh(.8,400,2000,.5),.45),(6.3,whoosh(.9,200,5000,.85),.8),(7.0,boom(1.0,90,40),.6),
 (7.6,swipe(.35),.5),(9.4,whoosh(.6),.55),(10.2,coin(),.7),(10.3,shimmer(.8),.5),
 (11.45,splash(),.8),(11.8,shimmer(1.0),.6),(11.8,riser(1.0,300,3000),.3),(12.75,pop(700,250),.7),(13.05,ding(2349,1.0),.7),
 (13.6,whoosh(.5,300,4000,.5),.7),(14.1,pop(),.6),(14.5,shimmer(.9),.6),(15.15,pop(600,220,.12),.8),
 (15.9,coin(),.55),(16.75,coin(),.55),(17.6,coin(),.55),(15.5,riser(2.8,200,2500),.22),
 (18.4,whoosh(.6,5000,300,.3),.6),(19.0,boom(.8,90,45),.45),(19.25,shimmer(.8),.6),(20.05,whoosh(.65,200,5000,.85),.75),(20.7,boom(1.0,90,40),.55),
 (21.25,pop(),.6),(21.3,ding(1567.98,.9),.5),(22.5,swipe(.4),.6),(23.25,boom(.9,120,50),.7),
 (24.0,riser(.6,300,2500),.4),(24.0,shimmer(.7),.5),
 (25.0,pop(800,300),.6),(25.25,pop(850,300),.6),(25.5,pop(900,300),.6),(25.75,pop(950,300),.6),
 (25.05,tick(),.5),(25.3,tick(),.5),(25.55,tick(),.5),(25.8,tick(),.5),
 (28.0,whoosh(.45,4000,300,.3),.5),(28.4,boom(1.2,100,38),.9),
 (30.8,whoosh(.5),.45),(31.2,thunder(),.95),(31.2,boom(1.4,80,30),.6),(32.0,boom(.7,140,60),.6),
 (33.7,pop(600,250,.12),.6),(34.55,swipe(.3),.75),(35.0,beep(),.55),(35.45,whoosh(.4,2500,400,.2),.4),(35.8,boom(),.95),
 (36.4,whoosh(.8,300,5000,.6),.8),(37.1,pop(),.6),(37.3,riser(1.3,200,2200),.35),(38.6,ding(1318.5,1.0),.45),
 (40.4,pop(),.55),(40.8,tick(),.8),(40.85,ding(2637,.9),.6),(41.9,pop(500,200),.55),(42.2,clunk(),.8),
 (43.0,whoosh(.35,800,4000,.5),.5),(43.05,tick(),.7),(43.3,riser(1.3,200,3000),.4),(44.5,boom(1.0,100,45),.7),(44.55,coin(),.7),
 (45.85,whoosh(.4,300,3000,.6),.5),(46.1,boom(1.6,70,32),.7),(46.1,shimmer(2.2),.7),
]
sfx = np.zeros(len(voice), np.float32)
for v, snd, g in FX:
    i = int(v2o(v)*SR); s = np.asarray(snd, np.float32)[:len(sfx)-i]; sfx[i:i+len(s)] += s*g
sfx_wet = convolve(sfx, make_ir(1.8, .02))
sfx_st = np.stack([sfx, sfx]) + .25*sfx_wet/ (np.max(np.abs(sfx_wet))+1e-9) * np.max(np.abs(sfx))
save(os.path.join(HERE,'voice_fx.wav'), voice_st)
save(os.path.join(HERE,'sfx.wav'), sfx_st)

# ---------- 5. mix: SFX ducked under the voice, loudness -14 LUFS ----------
run('ffmpeg','-v','error','-y','-i',os.path.join(HERE,'voice_fx.wav'),'-i',os.path.join(HERE,'sfx.wav'),'-filter_complex',
    '[1:a]volume=0.55[s];[0:a]asplit=2[v][sc];[s][sc]sidechaincompress=threshold=0.04:ratio=5:attack=8:release=250[sd];'
    '[v][sd]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.2:LRA=9,'
    f'atrim=0:{TOTAL+0.05:.3f},afade=t=out:st={TOTAL-0.4:.3f}:d=0.4',
    '-ar',str(SR),os.path.join(HERE,'mix.wav'))
print(f'total {TOTAL:.2f}s, anchors {len(anchors)}')

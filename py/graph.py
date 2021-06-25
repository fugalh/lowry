import matplotlib.pyplot as plt, mpld3
import lowry
Q_ = lowry.ureg.Quantity

# [PoLA] table 7.1
plate71 = {
    'S': Q_('174 ft^2'),
    'A': 7.38,
    'M0': Q_('311.2 ft lbf'),
    'C': 0.12,
    'd': Q_('6.25 ft'),
    'C_D0': 0.037,
    'e': 0.72,
    'm': 1.70,
    'b': -0.0564,
}

vs = range(30, 130)
perf = [lowry.performance(plate71, Q_(2400, 'lbf'), Q_(8000, 'ft'), Q_(V, 'knots')) for V in vs]

hs = range(0,20)
fig, ax = plt.subplots()
ax.plot(hs, [lowry.relativeDensity(Q_(h * 1000, 'ft')) for h in hs], label='sigma')
ax.plot(hs, [lowry.dropoffFactor(Q_(h * 1000, 'ft')) for h in hs], label='phi(sigma)')
ax.set_title('[PoLA] figure 7.5')
ax.set_xlabel('Altitude (thousand feet)')
ax.legend()

fig, ax = plt.subplots()
ax.plot(vs, [x['Pav'].m_as('horsepower') for x in perf], label='Pav')
ax.plot(vs, [x['Pre'].m_as('horsepower') for x in perf], label='Pre')
ax.plot(vs, [x['Pxs'].m_as('horsepower') for x in perf], label='Pxs')
ax.set_ylim(bottom=0)
ax.set_xlim(left=0)
ax.set_title('[PoLA] figure 7.3')
ax.set_ylabel('Horespower')
ax.set_xlabel('KTAS')
ax.legend()
mpld3.show()

#!/usr/bin/env python3

## References
# [Bootstrap] Lowry, John T. (1995). The Bootstrap Approach to Predicting
# Airplane Flight Performance. Journal of Aviation/Aerospace Education &
# Research, 6(1) https://doi.org/10.15394/jaaer.1995.1167
#
# [PoLA] Lowry, John T. Performance of Light Aircraft. American Institute of
# Aeronautics and Astronautics, Inc., 1999.
# https://arc.aiaa.org/doi/book/10.2514/4.103704

## Conventions
# On subscripts and underscores: prioritize visual shape
# Vy but V_M and h_p
#
# VC for calibrated airspeed, V for true
# e.g. VCy vs Vy, VC_M vs V_M
#
# Altitude: h_p for pressure altitude, h_rho for density altitude.
# Temperature: T

import math
import numpy

import pint
ureg = pint.UnitRegistry()
Q_ = ureg.Quantity

# Constants
rho0 = Q_(0.00237, 'slug / ft^3')

# Helpers
def isQuantity(x):
    return isinstance(x, Q_)

def lower(x, u):
    if isQuantity(x):
        return x.to(u).magnitude
    return x

# Atmosphere
def standardTemperature(h_p):
    T0 = Q_(288.15, 'degK')
    lapseRate = Q_(0.001981, 'degK/ft')
    return T0 - h_p * lapseRate

def relativeDensity(h_p, T=None):
    """ aka σ """
    h_p = h_p.m_as('ft')
    if T is not None:
        # [PoLA] eq F.2
        return (518.7 / T.m_as('degR')) * (1 - 6.8752e-6 * h_p)
    # [PoLA] eq 1.10
    return (1 - h_p / 145457) ** 4.25635

def dropoffFactor(h_p, T=None, C=0.12):
    return (relativeDensity(h_p, T) - C) / (1 - C)

def density(h_p, T=None):
    """ without T, assumes standard atmosphere """
    return rho0 * relativeDensity(h_p, T)

def tas(VC, h_p, T=None):
    return (VC / math.sqrt(relativeDensity(h_p, T))).to('knots')

def cas(V, h_p, T=None):
    return (V * math.sqrt(relativeDensity(h_p, T))).to('knots')

# [PoLA] eq F.4
def tapeline(dh_p, h_p, T=None):
    """ dh_p is pressure altitude delta, h_p is average pressure altitude """
    if T is None:
        return dh_p
    return (T.to('kelvin') / standardTemperature(h_p).to('kelvin')) * dh_p

# expects true airspeed, tapeline dh
def flightAngle(V, dh, dt):
    # [Bootstrap] eq 3
    return Q_(math.asin(dh / (V * dt)), 'radian').to('degree')

# The Bootstrap Method
def bootstrap(data):
    """ airframe and flight test data -> bootstrap data plate """
    plate = data  # TODO extract only the canonical?
    if 'A' not in data and 'B' in data and 'S' in data:
        plate['A'] = (data['B'] ** 2 / data['S']).to('')
    if 'M0' not in data and 'P0' in data and 'n0' in data:
        # Q_(2700, 'rpm') == 2 * math.pi * Q_(2700, '1/min')
        # so we leave out the 2π factor in the denominator
        plate['M0'] = (data['P0'] / data['n0']).to('ft lbf')
    if 'C' not in data:
        plate['C'] = 0.12

    if 'drag' in data:
        # [PoLA] appendix F
        drag = data['drag']
        h_p = drag['h_p']
        T = drag['T']
        sigma = relativeDensity(h_p, T)
        dh = tapeline(drag['dh_p'], h_p, T)
        Vbg = tas(drag['VCbg'], h_p, T)
        gamma_bg = flightAngle(Vbg, dh, drag['dt'])

        # [PoLA] eq 9.41
        # I think there's a sign error; eq 9.41 uses -W but that gives the wrong sign.
        rho = rho0 * sigma
        plate['C_D0'] = drag['W'] * math.sin(gamma_bg) / (rho * plate['S'] * Vbg ** 2)
        plate['C_D0'].ito('')
        plate['e'] = 4 * plate['C_D0'] / (math.pi * plate['A'] * math.tan(gamma_bg) ** 2)

    if 'thrust' in data:
        thrust = data['thrust']
        h_p = thrust['h_p']
        T = thrust['T']
        rho = density(thrust['h_p'], thrust['T'])
        phi = dropoffFactor(h_p, T)
        d = plate['d']
        Vx = tas(thrust['VCx'], h_p, T)
        V_M = tas(thrust['VC_M'], h_p, T)
        W = thrust['W']

        # [Bootstrap] eq 8, [PoLA] eq 7.1
        plate['b'] = plate['S'] * plate['C_D0'] / (2 * d * d) - (
            2 * W * W / (rho * rho * d * d * plate['S']
                * math.pi * plate['e'] * plate['A'] * Vx ** 4)
        )
        plate['b'].ito('')

        # [Bootstrap] eq 9, but substituting πM0 = P0/2n0
        plate['m'] = (d * W * W /
            (math.pi * plate['M0'] * phi * rho * plate['S'] *
                math.pi * plate['e'] * plate['A'])
        ) * (1 / (V_M * V_M) + (V_M * V_M) / (Vx ** 4))
        plate['m'].ito('')

    # mock overrides for testing
    for k in ['C_D0', 'e', 'b', 'm']:
        if k in data:
            plate[k] = data[k]

    return plate


def composites(plate, W, h_rho):
    # We don't worry about W/W0, instead we just calculate the base
    # composites on the fly. CPU is cheap.
    phi = dropoffFactor(h_rho, C=plate['C'])
    rho = density(h_rho)
    sigma = relativeDensity(h_rho)

    # composites [Bootstrap] pg 27-28
    # substituting πM0 = P0/2n0
    E0 = plate['m'] * plate['M0'] * 2 * math.pi / plate['d']
    F0 = rho0 * plate['d'] ** 2 * plate['b']
    G0 = rho0 * plate['S'] * plate['C_D0'] / 2
    H0 = 2 * W * W / (rho0 * plate['S'] * math.pi * plate['e'] * plate['A'])
    K0 = F0 - G0
    Q0 = E0 / K0
    R0 = H0 / K0
    U0 = H0 / G0

    return {
        'E': phi * E0,
        'F': sigma * F0,
        'G0': G0,
        'G': sigma * G0,
        'H0': H0,
        'H': H0 / sigma,
        'K': sigma * K0,
        'Q': phi * Q0 / sigma,
        'R': R0 / (sigma * sigma),
        'U': U0 / (sigma * sigma),
    }


def performance(plate, W, h_rho, V = None):
    """ Calculate performance data given a bootstrap data plate, weight, density altitude, and optionally true(?) airspeed.
    Airspeed is required to calculate ... """
    c = composites(plate, W, h_rho)
    sigma = relativeDensity(h_rho)
    ret = {}

    # [PoLA] eq 7.19
    ret['V_M'] = (-c['Q'] / 2 + (c['Q'] ** 2 / 4 + c['R']) ** 0.5) ** 0.5
    # [PoLA] eq 7.21
    ret['Vm'] = (-c['Q'] / 2 - (c['Q'] ** 2 / 4 + c['R']) ** 0.5) ** 0.5
    # [PoLA] eq 7.24
    ret['Vy'] = (-c['Q'] / 6 + (c['Q'] ** 2 / 36 - c['R'] / 3) ** 0.5) ** 0.5
    # [PoLA] eq 7.39, aka ROC_max
    ret['ROC_y'] = (c['E'] * ret['Vy'] + c['K'] * ret['Vy'] ** 3 - c['H'] / ret['Vy']) / W
    # [PoLA] eq 7.27
    ret['Vx'] = (-c['R']) ** 0.25
    # [PoLA] eq 7.31
    ret['Vbg'] = c['U'] ** 0.25
    # [PoLA] eq 7.33
    ret['Vmd'] = Vmd = (c['U'] / 3) ** 0.25
    for vspeed in ['V_M', 'Vm', 'Vy', 'Vx', 'Vbg', 'Vmd']:
        vcspeed = 'VC' + vspeed[1:]
        ret[vcspeed] = cas(ret[vspeed], h_rho)

    # eq 7.44
    ret['gamma_x'] = numpy.arcsin((c['E'] - 2 * (-c['K'] * c['H']) ** 0.5) / W)
    # eq 7.48 is weird for units, so plug Vmd into eq 7.46
    ret['ROC_md'] = (-c['G'] * Vmd ** 3 - c['H'] / Vmd) / W
    ret['ROS_md'] = ret['ROC_md']
    # eq 7.51
    ret['gamma_bg'] = -numpy.arcsin(2 * (c['G'] * c['H']) ** 0.5 / W)

    if V:
        # [PoLA] eq 7.35
        ret['T'] = T = c['E'] + c['F'] * V * V
        # eq 7.37
        ret['Dp'] = Dp = c['G'] * V * V
        ret['Di'] = Di = c['H'] / (V * V)
        ret['D'] = D = Dp + Di
        # eq 7.39
        ret['ROC'] = ROC = (c['E'] * V + c['K'] * V ** 3 - c['H'] / V) / W
        # eq 7.9
        ret['Pre'] = Pre = D * V
        # [PoLA] eq 7.14
        ret['Pav'] = Pav = T * V
        # eq 7.17
        ret['Pxs'] = Pxs = Pav - Pre
        ret['Txs'] = T - D  # pg 192
        # eq 7.41
        ret['gamma'] = numpy.arcsin(ROC / V)

    return ret

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
    return pow(1 - h_p / 145457, 4.25635)

def density(h_p, T=None):
    """ without T, assumes standard atmosphere """
    return rho0 * relativeDensity(h_p, T)

def tas(VC, h_p, T=None):
    return VC / math.sqrt(relativeDensity(h_p, T))

def cas(V, h_p, T=None):
    return V * math.sqrt(relativeDensity(h_p, T))

# [PoLA] eq F.4
def tapeline(dh, h_p, T=None):
    if T is None:
        return dh
    return (T.to('kelvin') / standardTemperature(h_p).to('kelvin')) * dh

# expects true airspeed, tapeline dh
def flightAngle(V, dh, dt):
    # [Bootstrap] eq 3
    return Q_(math.asin(dh / (V * dt)), 'radian').to('degree')

# The Bootstrap Method
def bootstrap(input):
    """ airframe and flight test input -> bootstrap data plate """
    pass


def performance(plate, W, h_rho, V = None):
    """ Calculate performance data given a bootstrap data plate, weight, density altitude, and optionally true(?) airspeed.
    Airspeed is required to calculate ... """
    pass

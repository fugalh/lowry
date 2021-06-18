import pytest
import lowry
import pint

approx = pytest.approx
lower = lowry.lower
ureg = lowry.ureg
Q_ = ureg.Quantity

def assert_approx_Q(a, b, **kwargs):
    assert a.is_compatible_with(b)
    assert a.m_as(b.units) == approx(b.magnitude, **kwargs)

class TestHelpers:
    def test_lower(self):
        h_p = Q_(5750, 'ft')
        T = Q_(45, 'degF')
        assert lowry.isQuantity(h_p)
        assert not lowry.isQuantity(h_p.magnitude)
        assert lower(h_p, h_p.units) == h_p.magnitude
        assert lower(T, T.units) == T.magnitude
        assert lower(T.magnitude, T.units) == T.magnitude

class TestAtmosphere:
    def test_standardTemperature(self):
        assert_approx_Q(lowry.standardTemperature(Q_('36090 ft')), Q_(-56.5, 'degC'), abs=0.1)

    def test_relativeDensity(self):
        assert lowry.relativeDensity(Q_('5000 ft')) == approx(0.86167, rel=1e-4)
        h_p = Q_(5750, 'ft')
        T = Q_(45, 'degF')
        assert lowry.relativeDensity(h_p, T) == approx(0.9871, 1e-4)

    def test_density(self):
        h_p = Q_(5750, 'ft')
        T = Q_(45, 'degF')
        assert_approx_Q(lowry.density(h_p, T), Q_('0.002339 slug / ft^3'), rel=1e-3)

    def test_tas(self):
        V_cas = Q_('70.5 kts')
        V_tas = Q_('119.8 ft/s')
        h_p = Q_('5750 ft')
        T = Q_(45, 'degF')
        assert_approx_Q(lowry.tas(V_cas, h_p, T), V_tas, abs=0.1)
        assert_approx_Q(lowry.cas(V_tas, h_p, T), V_cas, abs=0.1)

    def test_tapeline(self):
        dt = Q_('39.10 s')
        dh = Q_('500 ft')
        h_p = Q_('5750 ft')
        T = Q_(45, 'degF')
        V = lowry.tas(Q_(('70.5 kts')), h_p, T)
        tapeline = lowry.tapeline(dh, h_p, T)
        gamma = lowry.flightAngle(V, tapeline, dt)

        assert_approx_Q(tapeline, Q_(506.5, 'ft'), abs=0.1)
        assert_approx_Q(gamma, Q_(6.21, 'deg'), abs=0.01)

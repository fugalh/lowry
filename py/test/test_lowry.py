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

class TestBootstrap:
    def test_appendixF(self):
        data = {
            'S': Q_('174 ft^2'),
            'B': Q_('35.83 ft'),
            'P0': Q_('160 horsepower'),
            'n0': Q_('2700 rpm'),
            # C: 0.12,
            'd': Q_('6.25 ft'),
            'drag': {
                'W': Q_('2200 lbf'),
                'dh_p': Q_('200 ft'),
                'VCbg': Q_('70 kts'),
                'dt': Q_('17.0 sec'),

                'W': Q_('2209 lbf'),
                'h_p': Q_('5750 ft'),
                'T': Q_(45, 'degF'),
                'VCbg': Q_('70.5 kts'),
                'dh_p': Q_('500 ft'),
                'dt': Q_('39.10 s'),
            }
        }

        drag = data['drag']
        VCbg = drag['VCbg']
        dt = drag['dt']
        h_p = drag['h_p']
        T = drag['T']

        assert_approx_Q(VCbg, Q_(119.0, 'ft/s'), abs=0.1)
        assert lowry.relativeDensity(h_p, T) == approx(0.9871, abs=1e-4)
        assert_approx_Q(lowry.density(h_p, T), Q_(0.002339, 'slug / ft^3'), rel=1e-3)

        Vbg = lowry.tas(VCbg, h_p, T)
        assert_approx_Q(Vbg, Q_(119.8, 'ft/s'), abs=0.1)

        dh_p = Q_('500 ft')
        dh = lowry.tapeline(dh_p, h_p, T)
        assert_approx_Q(dh, Q_('506.5 ft'), abs=0.1)
        assert_approx_Q(lowry.flightAngle(Vbg, dh, dt), Q_(6.21, 'deg'), abs=0.01)

        plate = lowry.bootstrap(data)

        # hand calculated, slightly different from the book
        assert plate['C_D0'] == approx(0.04093, rel=1e-3)
        assert plate['e'] == approx(0.5964, rel=1e-3)

    def test_composites0(self):
        """ see [PoLA] table 7.3, but hand calculated """
        # mock the precise data plate from table 7.1, to avoid compounding error
        W = Q_('2400 lbf')
        h_rho = Q_('0 ft')
        c = lowry.composites(plate71, W, h_rho)

        assert lowry.relativeDensity(h_rho) == approx(1)
        assert lowry.dropoffFactor(h_rho) == approx(1)
        assert_approx_Q(c['E'], Q_(531.9, 'lbf'), rel=3)
        assert_approx_Q(c['F'], Q_(-0.00522, 'slug / ft'), rel=3)
        assert_approx_Q(c['G'], Q_(0.00763, 'slug / ft'), rel=3)
        assert_approx_Q(c['H'], Q_(1673000, 'ft lbf^2 / slug'), rel=3)
        assert_approx_Q(c['K'], Q_(-0.012889, 'slug / ft'), rel=3)
        assert_approx_Q(c['Q'], Q_(-41390, 'ft lbf / slug'), rel=3)
        assert_approx_Q(c['R'], Q_(-1.294e8, 'ft^2 lbf^2 / slug^2'), rel=3)
        assert_approx_Q(c['U'], Q_(-2.181e8, 'ft^2 lbf^2 / slug^2'), rel=3)

    def test_composites_at_altitude(self):
        """ see [PoLA] table 7.3, but hand calculated """
        # mock the precise data plate from table 7.1, to avoid compounding error
        W = Q_('1800 lbf')
        h_rho = Q_('8000 ft')
        c = lowry.composites(plate71, W, h_rho)

        assert lowry.relativeDensity(h_rho) == approx(0.7860, rel=3)
        assert lowry.dropoffFactor(h_rho) == approx(0.7568, rel=3)
        assert_approx_Q(c['E'], Q_(402.6, 'lbf'), rel=3)
        assert_approx_Q(c['F'], Q_(-0.004103, 'slug / ft'), rel=3)
        assert_approx_Q(c['G'], Q_(0.005997, 'slug / ft'), rel=3)
        assert_approx_Q(c['H'], Q_(1198000, 'ft lbf^2 / slug'), rel=3)
        assert_approx_Q(c['K'], Q_(-0.01010, 'slug / ft'), rel=3)
        assert_approx_Q(c['Q'], Q_(-39850, 'ft lbf / slug'), rel=3)
        assert_approx_Q(c['R'], Q_(-1.186e8, 'ft^2 lbf^2 / slug^2'), rel=3)
        assert_approx_Q(c['U'], Q_(-1.998e8, 'ft^2 lbf^2 / slug^2'), rel=3)

    def test_table75(self):
        # [PoLA] table 7.5
        V = Q_('75 kts');
        y = lowry.performance(plate71, Q_('2400 lbf'), Q_('0 ft'), V)
        # assert_approx_Q(y['T'],     Q_(448.0, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Pav'],   Q_(103.1, 'horsepower'), abs=0.1)
        # assert_approx_Q(y['Dp'],    Q_(122.6, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Di'],    Q_(104.1, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['D'],     Q_(226.7, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Pre'],   Q_(52.2 , 'horsepower'), abs=0.1)
        # assert_approx_Q(y['Pxs'],   Q_(50.9 , 'horsepower'), abs=0.1)
        # assert_approx_Q(y['ROC'],   Q_(700.2, 'ft/min'    ), abs=0.1)
        # assert_approx_Q(y['Txs'],   Q_(221.3, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['gamma'], Q_(5.29 , 'deg'       ), abs=0.01)
        assert_approx_Q(y['Vy'], Q_(75.8, 'kts'), abs=1)
        assert_approx_Q(y['Vx'], Q_(63.2, 'kts'), abs=1)
        assert_approx_Q(y['V_M'], Q_(115.3, 'kts'), abs=1)
        assert_approx_Q(y['Vbg'], Q_(72.0, 'kts'), abs=1)
        assert_approx_Q(y['Vmd'], Q_(54.7, 'kts'), abs=1)

        y = lowry.performance(plate71, Q_('1800 lbf'), Q_('8000 ft'), V)
        # assert_approx_Q(y['T'],     Q_(318.7, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Pav'],   Q_(82.7 , 'horsepower'), abs=0.1)
        # assert_approx_Q(y['Dp'],    Q_(122.6, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Di'],    Q_(58.6 , 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['D'],     Q_(181.2, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['Pre'],   Q_(47.0 , 'horsepower'), abs=0.1)
        # assert_approx_Q(y['Pxs'],   Q_(35.7 , 'horsepower'), abs=0.1)
        # assert_approx_Q(y['ROC'],   Q_(654.3, 'ft/min'    ), abs=0.1)
        # assert_approx_Q(y['Txs'],   Q_(137.5, 'lbf'       ), abs=0.1)
        # assert_approx_Q(y['gamma'], Q_(4.38 , 'deg'       ), abs=0.01)
        assert_approx_Q(y['Vy'], Q_(65.9, 'kts'), abs=1)
        assert_approx_Q(y['Vx'], Q_(54.7, 'kts'), abs=1)
        assert_approx_Q(y['V_M'], Q_(100.4, 'kts'), abs=1)
        assert_approx_Q(y['Vbg'], Q_(62.4, 'kts'), abs=1)
        assert_approx_Q(y['Vmd'], Q_(47.4, 'kts'), abs=1)

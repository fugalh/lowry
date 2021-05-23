const math = require('mathjs')

// custom units
math.createUnit('slug', '1 lbf s^2 / ft')
math.createUnit('HP', '550 ft lbf / sec')
math.createUnit('rpm', '1/minute')
math.createUnit('rps', '1/second')

// constants
const constants = {
    C: 0.12,
    rho0: math.unit('0.00237 slug/ft^3'), // standard density
}

exports.plate = (data) => {
    const tau = 2 * math.pi;
    return {
        S: data.S,
        A: math.divide(math.multiply(data.B, data.B), data.S),
        M0: math.divide(data.P0, math.multiply(tau, data.n0)),
        C: constants.C,
        d: data.d,
    };
}

exports.constants = constants
exports.math = math

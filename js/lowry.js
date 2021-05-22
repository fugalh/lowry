const math = require('mathjs')

// custom units
math.createUnit('slug', '1 lbf s^2 / ft');

// constants
const constants = {
    C: 0.12,
    rho0: math.unit('0.00237 slug/ft^3'), // standard density
}

exports.constants = constants;

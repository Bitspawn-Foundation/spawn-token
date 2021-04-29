const spawn = artifacts.require('Bitspawn');

module.exports = function(deployer) {
    deployer.deploy(spawn)
};

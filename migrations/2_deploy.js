const StarfleetStake = artifacts.require("StarfleetStake");
const TestTraceToken = artifacts.require("TestTraceToken");

module.exports = function (deployer,helper, accounts) {
  deployer.deploy(TestTraceToken).then(function(){
   return deployer.deploy(StarfleetStake,0,TestTraceToken.address);
  });
  
};

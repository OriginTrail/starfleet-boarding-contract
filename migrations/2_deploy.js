const StarfleetStake = artifacts.require("StarfleetStake");
const TestTraceToken = artifacts.require("TestTraceToken");

module.exports = function (deployer,helper, accounts) {
  deployer.deploy(TestTraceToken).then(function(){
   return deployer.deploy(StarfleetStake,0,TestTraceToken.address);
  });

  // ATRAC deployment
  //deployer.deploy(StarfleetStake,0,"0x98d9a611ad1b5761bdc1daac42c48e4d54cf5882")
  
};

const PhoenixLottery = artifacts.require('./PhoenixLottery.sol')
const IdentityRegistry = artifacts.require('./IdentityRegistry.sol')
const PhoenixTokenTestnet = artifacts.require('./PhoenixTokenTestnet.sol')
const Randomizer = artifacts.require('./Randomizer.sol')
const RandomizerTest = artifacts.require('./RandomizerTest.sol')
let tokenInstance
let identityRegistryInstance
let randomizer

module.exports = async (deployer, network) => {
    if(network != 'live'){

        // console.log('Deploying contracts...')
        //
        // await deployer.then(() => {
        //     return Randomizer.new()
        // }).then(randomizerAddress => {
        //     randomizer = randomizerAddress.address
        //     console.log('Deployed randomizer', randomizer)
        // })
        //
        // await deployer.then(() => {
        //     return PhoenixTokenTestnet.new()
        // }).then(token => {
        //     tokenInstance = token.address
        //     console.log('Deployed token', tokenInstance)
        // })
        //
        // await deployer.then(() => {
        //     return IdentityRegistry.new({
        //         gas: 8e6
        //     })
        // }).then(identityRegistry => {
        //     identityRegistryInstance = identityRegistry.address
        //     console.log('Deployed identityRegistry', identityRegistryInstance)
        // })
        //
        // await deployer.then(() => {
        //     return deployer.deploy(
        //         PhoenixLottery,
        //         identityRegistryInstance,
        //         tokenInstance,
        //         randomizer, {
        //             gas: 8e6
        //         }
        //     )
        // }).then(phoenixLottery => {
        //     console.log('Deployed phoenixLottery', phoenixLottery.address)
        // })
    }
}

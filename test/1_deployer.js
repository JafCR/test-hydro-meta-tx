const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const BN = require('bignumber.js')
const ethers = require('ethers')
const config = require('./config.json')
const { getProvider } = require('./lib/support.js')

chai.use(chaiAsPromised)
expect = chai.expect
const Deployer = require('hydro-meta-tx').deployer

var provider = getProvider()
const privateKey = config.privateKey

const deployer = new Deployer({ provider, privateKey })
var token
var addresses = {}
var clientWallet

describe('Deployer Tests', function() {
  this.timeout(0)

  it('Deploy Meta-Tx Smart Contracts and export to file', async () => {
    let result = await deployer.deploy({ gweiGasPrice: config.gweiGasPrice })

    expect(result.smartWallet.address).to.be.not.undefined
    expect(result.registry.address).to.be.not.undefined
    expect(result.factory.address).to.be.not.undefined

    addresses.smartWallet = result.smartWallet.address
    addresses.factory = result.factory.address
    addresses.registry = result.registry.address

    deployer.exportContracts(result, config.contractsFile)
  })

  it('Import Meta-Tx Smart Contracts from file', async () => {
    let results = deployer.importContracts(config.contractsFile)
    expect(results.smartWallet.address).to.be.equal(addresses.smartWallet)
    expect(results.factory.address).to.be.equal(addresses.factory)
    expect(results.registry.address).to.be.equal(addresses.registry)
  })

  it('Deploy Test ERC20 Token and export it to file', async () => {
    token = await deployer.deployERC20({ gweiGasPrice: config.gweiGasPrice })
    expect(token.address).to.be.not.undefined
    expect(token.contract).to.be.not.undefined
    deployer.exportERC20Contract(token, config.erc20File)
  })

  it('Mint some tokens', async () => {
    // Create random account
    clientWallet = new ethers.Wallet.createRandom()
    console.log('New Random Wallet:', clientWallet.address)
    let tx = await token.contract.mint(clientWallet.address, 100)
    await tx.wait()
    let balance = await token.contract.balanceOf(clientWallet.address)
    expect(balance.toString()).to.be.equal('100')
  })

  it('Import ERC20 Token and check balance', async () => {
    let token = deployer.importERC20Contract(config.erc20File)
    let balance = await token.contract.balanceOf(clientWallet.address)
    expect(balance.toString()).to.be.equal('100')
  })
})

// deployer.deployERC20().then((res) => {
//     console.log('Token address:', res)
// })

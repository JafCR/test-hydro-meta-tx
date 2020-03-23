const config = require('../config.json')
const ethers = require('ethers')

function getProvider(){
    var provider
    if(config.INFURA_NETWORK) {
        provider = new ethers.providers.InfuraProvider(config.INFURA_NETWORK,config.INFURA_TOKEN)
    }
    else {
        provider = new ethers.providers.JsonRpcProvider(config.PROVIDER_ADDRESS)
    }

    return provider
}
    
module.exports={
    getProvider
}
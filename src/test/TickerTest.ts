import {BittrexClient} from '../';
import {Config} from './Config';

const bittrex = new BittrexClient(Config.bittrex.readonly);

bittrex.ticker('BTC-NEO').then((ticker) => {
	console.log(ticker);
}, (error) => {
	console.log(error);
});

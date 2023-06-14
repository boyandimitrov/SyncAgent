import logo from './logo.svg';
import './App.css';

import Pivot from './Components/Pivot';
import PivotBar from './Components/PivotBar';

import { Layout } from 'antd';

const ds = {
    "dataset" : "Mall",
    "table" : "VIEW"
}
const fields = ["transaction_status", "transaction_created_master", "transactionLines_price", "transactionLines_quantityType", "transactionLines_quantityValue"]
const schema = [
    {"name":"transaction_status","type":"string","mode":"nullable"},
    {"name":"transaction_created_master","type":"timestamp","mode":"nullable"},
    {"name":"transactionLines_price","type":"float64"},
    {"name":"transactionLines_quantityType","type":"string"},
    {"name":"transactionLines_quantityValue","type":"float64","mode":"nullable"},
    // {"name":"Country","type":"string","mode":"nullable"},
    // {"name":"State","type":"string","mode":"nullable", subtype: "us_state", prop : "NAME"},
    // {"name":"City","type":"string","mode":"nullable", subtype: "city"}
];

function AppF() {
  return (
    <div className="App">

        <Pivot fields={fields} schema={schema} ds={ds}/>
    </div>
  );
}

// function App() {
//   return (
//     <div className="App">

//         <PivotBar />
//     </div>
//   );
// }

export default AppF;

import logo from './logo.svg';
import './App.css';

import Pivot from './Components/Pivot';
import PivotBar from './Components/PivotBar';

import { Layout } from 'antd';

const ds = {
    "dataset" : "Mall",
    "table" : "VIEW"
}
const fields = ["product_base_name_bg", "transactionLines_price", "transactionLines_quantityType", "transactionLines_quantityValue", "transaction_status"]
const schema = [
    {"name":"product_base_name_bg","type":"string","mode":"nullable"},
    {"name":"transaction_status","type":"string","mode":"nullable"},
    {"name":"transaction_created_master","type":"timestamp","mode":"nullable"},
    {"name":"transactionLines_price","type":"NUMERIC"},
    {"name":"transactionLines_quantityType","type":"string"},
    {"name":"transactionLines_quantityValue","type":"NUMERIC","mode":"nullable"},
    {"name":"transaction_created_year","type":"int64","system":true, subtype: "year"},
    {"name":"transaction_created_quarter","type":"int64","system":true, subtype: "quarter"},
    {"name" : "categories_name_bg", "type" : "string"},
    {"name" : "distributor_name", "type" : "string"},
    {"name" : "city_name", "type" : "string"},
    {"name" : "manufacturer_name", "type" : "string"},
    {"name" : "store_name", "type" : "string"},
    {"name" : "manufacturer_store_name", "type" : "string"},
    {"name" : "distributor_store_name", "type" : "string"},
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

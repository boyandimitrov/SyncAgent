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
    {"name":"product_base_name_bg","type":"string","mode":"nullable", label : "Продукт"},
    {"name":"transaction_status","type":"string","mode":"nullable", label : "Статус"},
    {"name":"transaction_created_master","type":"timestamp","mode":"nullable", label : "Дата"},
    {"name":"transactionLines_price","type":"NUMERIC", label : "Цена"},
    {"name":"transactionLines_profit","type":"NUMERIC", label : "Приход"},
    {"name":"transactionLines_quantityType","type":"string", label : "Тип"},
    {"name":"transactionLines_quantityValue","type":"NUMERIC","mode":"nullable", label : "Количества"},
    {"name":"transaction_created_year","type":"int64","system":true, subtype: "year", label : "Транзакция (година)"},
    {"name":"transaction_created_quarter","type":"int64","system":true, subtype: "quarter", label : "Транзакция (четвърт)"},
    {"name" : "categories0_name_bg", "type" : "string", "distinct" : {"table" : "VIEW", "field" : "categories0_name_bg"}, label : "Категория (главна)"},
    {"name" : "distributor_name", "type" : "string", label : "Дистрибутор"},
    {"name" : "shop_city_name_bg", "type" : "string", label : "Магазин (град)"},
    {"name" : "shop_area_name_bg", "type" : "string", label : "Магазин (община)"},
    {"name" : "manufacturer_name", "type" : "string", label : "Производител"},
    {"name" : "store_name", "type" : "string", label : "Склад"},
    {"name" : "distributor_store_name", "type" : "string", label : "Склад на дистрибутор"},
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

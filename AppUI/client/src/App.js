import logo from './logo.svg';
import './App.css';

import Pivot from './Components/Pivot';
import PivotBar from './Components/PivotBar';

import { Layout } from 'antd';

const fields = ["property_address_id.state", "reservation_date","consumer_country", "reservation_price"]
const ds = {
  "dataset" : "Hostify",
  "table" : "reservations"
}
const schema = [
    {"name":"consumer_sex","type":"string","mode":"nullable"},
    {"name":"consumer_name","type":"string","mode":"nullable"},
    {"name":"consumer_email","type":"string"},
    {"name":"consumer_country","type":"string"},
    {"name":"property_name","type":"string","mode":"nullable"},
    {"name":"property_address_id.country","type":"string"},
    {"name":"property_address_id.state","type":"string",subtype:"us_state", prop : "STUSPS"},
    {"name":"property_address_id.city","type":"string",subtype:"city"},
    {"name":"property_address_id.street","type":"string","mode":"nullable"},
    {"name":"property_rating","type":"int64","mode":"nullable"},
    {"name":"owner_sex","type":"string","mode":"nullable"},
    {"name":"owner_name","type":"string","mode":"nullable"},
    {"name":"reservation_period","type":"int64"},
    {"name":"reservation_price","type":"numeric"},
    {"name":"reservation_date","type":"timestamp"},
    {"name":"reservation_date_quarter","type":"int64","system":true, subtype: "quarter"},
    {"name":"reservation_date_half","type":"int64","system":true, subtype: "half"},
    {"name":"reservation_date_year","type":"int64","system":true, subtype: "year"},
    {"name":"reservation_date_month","type":"int64","system":true, subtype: "month"},
    {"name":"reservation_date_date","type":"int64","system":true, subtype: "date"},
    {"name":"reservation_date_day","type":"int64","system":true, subtype: "day"},
    {"name":"reservation_date_week","type":"int64","system":true, subtype: "week"},
    {"name":"consumer_birthday","type":"timestamp"},
    {"name":"consumer_birthday_quarter","type":"int64","system":true, subtype: "quarter"},
    {"name":"consumer_birthday_half","type":"int64","system":true, subtype: "half"},
    {"name":"consumer_birthday_year","type":"int64","system":true, subtype: "year"},
    {"name":"consumer_birthday_month","type":"int64","system":true, subtype: "month"},
    {"name":"consumer_birthday_date","type":"int64","system":true, subtype: "date"},
    {"name":"consumer_birthday_day","type":"int64","system":true, subtype: "day"},
    {"name":"consumer_birthday_week","type":"int64","system":true, subtype: "week"}
];

function App() {
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

export default App;

module.exports = {
    timestamp : [
        {"name" : "", type: "timestamp", func: (d) => {return new Date(d).getTime()/1000}},
        //{"name" : "", type: "timestamp", func: (d) => {let r = df.format(new Date(d), 'YYYY-MM-DD HH:mm:ss'); return r;}},
        //{"name" : "", type: "datetime", func: (d) => {return bigquery.datetime( new Date(d))}},
        {"name" : `_quarter`, type : "int64", subtype: "quarter", func : (d) => { return Math.floor(new Date(d).getMonth() / 3 + 1)}},
        {"name" : `_half`, type : "int64", subtype: "half", func : (d) => {return Math.floor(new Date(d).getMonth() / 6 + 1)}},
        {"name" : `_year`, type : "int64", subtype: "year", func : (d) => new Date(d).getFullYear()},
        {"name" : `_month`, type : "int64", subtype: "month", func : (d) => {return Math.floor(new Date(d).getMonth() + 1)}},
        {"name" : `_date`, type : "int64", subtype: "date", func : (d) => {return new Date(d).getDate()}},
        {"name" : `_day`, type : "int64", subtype: "day", func : (d) => {return new Date(d).getDay() + 1}},
        {"name" : `_week`, type : "int64", subtype: "week", func : (d) => {
            let dUtc = new Date(Date.UTC(new Date(d).getFullYear(), new Date(d).getMonth(), new Date(d).getDate()));
            let dayNum = dUtc.getUTCDay() || 7;
            dUtc.setUTCDate(dUtc.getUTCDate() + 4 - dayNum);
            let yearStart = new Date(Date.UTC(dUtc.getUTCFullYear(),0,1));
            return Math.ceil((((dUtc - yearStart) / 86400000) + 1)/7)
        }},
    ]

}

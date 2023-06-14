const ds_man = require('../api/data_manipulation');

const TBL_COMPANY = 'Companies';
const DS_FINANCE = "Finance";

const us_states = {
    "Alabama" : 1,
    "Alaska" : 1,
    "Arizona" : 1,
    "Arkansas" : 1,
    "California" : 1,
    "Colorado" : 1,
    "Connecticut" : 1,
    "Delaware" : 1,
    "Florida" : 1,
    "Georgia" : 1,
    "Hawaii" : 1,
    "Idaho" : 1,
    "Illinois" : 1,
    "Indiana" : 1,
    "Iowa" : 1,
    "Kansas" : 1,
    "Kentucky" : 1,
    "Louisiana" : 1,
    "Maine" : 1,
    "Maryland" : 1,
    "Massachusetts" : 1,
    "Michigan" : 1,
    "Minnesota" : 1,
    "Mississippi" : 1,
    "Missouri" : 1,
    "Montana" : 1,
    "Nebraska" : 1,
    "Nevada" : 1,
    "New Hampshire" : 1,
    "New Jersey" : 1,
    "New Mexico" : 1,
    "New York" : 1,
    "North Carolina" : 1,
    "North Dakota" : 1,
    "Ohio" : 1,
    "Oklahoma" : 1,
    "Oregon" : 1,
    "Pennsylvania" : 1,
    "Rhode Island" : 1,
    "South Carolina" : 1,
    "South Dakota" : 1,
    "Tennessee" : 1,
    "Texas" : 1,
    "Utah" : 1,
    "Vermont" : 1,
    "Virginia" : 1,
    "Washington" : 1,
    "West Virginia" : 1,
    "Wisconsin" : 1,
    "Wyoming" : 1
}


const run = async() => {
    const tables = await ds_man.load_tables([TBL_COMPANY], { dataset : DS_FINANCE, fields : ["Ticker", "Headquarter"]});

    debugger
    for (let i=0; i< tables[TBL_COMPANY].rows.length; i++ ) {
        let row = tables[TBL_COMPANY].rows[i]
        let hq = row.Headquarter;

        let parts = hq.split(",")
            .map(element => element.trim());;


        let update = `update big-query-363708.${DS_FINANCE}.${TBL_COMPANY} set `;
        let set = "";
        if ( us_states[parts[1]] ) {
            set = ` Country = 'USA', State="${parts[1]}",  City="${parts[0]}" `
        }
        else {
            set = ` Country = "${parts[1]}", City="${parts[0]}" `
        }

        update = update + set + ` where Ticker = "${row.Ticker}" `

        console.log(update)

        await ds_man.custom_query(update);
    }
}

run()
    .then(() => {
        console.log("Split ENDS")
    })
    .catch ( (e) => {
        console.log(e);
    })
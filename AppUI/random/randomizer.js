function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const generate_date = (from, to) => {
    const d = randomDate(new Date(from), new Date(to));
    console.log(d);
    return d.toISOString().split('T')[0];
};

function randomInt(min, max, interval) {
    if (typeof(interval)==='undefined') interval = 1;
    let r = Math.floor(Math.random()*(max-min+interval)/interval);
    return (r*interval+min);

}

const generate_number = ( range ) => {
    if ( range) {
        return randomInt(range[0], range[1], range[2]);
    }
    return randomInt(1,10)
}

const randomString = (length = 8) => {
    // Declare all characters
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // Pick characers randomly
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return str;
};

const generate_text = (words) => {
    if ( words ) {
        let text = [];
        const length = randomInt(words[0], words[1])
        for (let i=0; i < length; i++ ) {
            text.push(randomString());
        }
        return text.join(" ");
    }
    return randomString(16);
}

module.exports = {
    generate_date, generate_number, generate_text
}

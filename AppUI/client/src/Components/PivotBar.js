import React from 'react';
import axios from "axios";
import {select, selectAll, min, max, line, curveBasis, area, scaleLinear} from 'd3';
//import arr from './results';

const app_class = 'main-bars';
class PivotBar extends React.Component {
    
    constructor(props) {
        super(props);
        this.myRef = React.createRef(); 
    }

    getData() {
        console.log(process.env.REACT_APP_BASE_URL); 
        const query = {
            "dataset" : "Hostify",
            "table" : "reservations",
            "group" : [
                {
                    "field" : "consumer_country"
                },
                {
                    "field" : "reservation_date_year"
                },
                {
                    "field" : "reservation_date_quarter"
                }
            ],
            "aggregation" : [{
                "field" : "reservation_price",
                "formula" : "AVG"
            }]
        }


        let self = this;
        axios
            //.post(`${process.env.REACT_APP_BASE_URL}/aggregate`, this.props.query)
            .post(`${process.env.REACT_APP_BASE_URL}/aggregate`, this.props.query)
            .then((response) => {
                let data = self.prepare_structure(response.data.results);

                
                if ( ! select(`.${app_class}`).node() ) {
                    select(this.myRef.current)
                        .append('div')
                        //.text('Hello from D3')
                        .attr('class', app_class);
        
                        this.renderSVG( data);
                    }
            });
    }
   
    componentDidMount() {
        // if ( ! select(`.${app_class}`).node() ) {
        //     select(this.myRef.current)
        //         .append('div')
        //         .attr('class', app_class);

        //     this.renderSVG();
        // }
        this.getData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            this.getData();
        }
    }
    
    get_hash(db_data) {
        let data = db_data.map(item => {
            return item.group.concat(item.value);
        });
    
        let hash = data.reduce((accumulator, current) => {
            let country = current[0];
            let year = current[1];
            let quarter = current[2]-1;
            let value = current[3];
    
            if ( !accumulator[country] ) {
                accumulator[country] = {};
            }
    
            if ( !accumulator[country][year]) {
                accumulator[country][year] = [];
            }
    
            accumulator[country][year][quarter] = value;
    
            return accumulator;
        }, {})
    
        return hash;
    }
    
    prepare_structure(db_data) {
        let data = db_data.map(item => {
            return item.group.concat(item.value);
        })
          
        let countries = {};
        let years = {};
          
        data.forEach(item=> {
              
            countries[item[0]] = 1;
            years[item[1]] =1;
        })
          
        console.log(data[0], Object.keys(countries).length, Object.keys(years).length)
          
        let arr = Array.from(Array(Object.keys(countries).length+1), () => new Array(Object.keys(years).length+1));
          
        let rows = Object.keys(countries).sort();
        let columns = Object.keys(years).sort();
          
        for (let i=1; i<=columns.length; i++) {
            arr[0][i] = columns[i-1];
        }
          
        for (let i=1; i<= rows.length; i++ ) {
            arr[i][0] = rows[i-1];
        }
          
        let hash = this.get_hash(db_data);
        for ( let i=1; i < arr.length; i++ ) {
            for (let j=1; j< arr[i].length; j++ ) {
                console.log(arr[i][0], arr[0][j])
                arr[i][j] = hash[arr[i][0]][arr[0][j]];
            }
        }
    
        return arr;
    }
    
    gridData (arr) {
        var data = new Array();
        var xpos = 1; 
        var ypos = 1;
        var width = 50;
        var height = 50;
    
        for (var row = 0; row < arr.length; row++) {
            data.push( new Array() );
    
            for (var column = 0; column < arr[row].length; column++) {
                if ( column === 0)    {
                    data[row].push({
                        x: xpos,
                        y: ypos,
                        width: width*3,
                        height: height,
                        text: Array.isArray(arr[row][0]) ? "" : arr[row][0],
                        value : Array.isArray(arr[row][0]) ? arr[row][0] : [],
                    })

                    xpos += width*3;
                }
                else {
                    data[row].push({
                        x: xpos,
                        y: ypos,
                        width: width,
                        height: height,
                        text: Array.isArray(arr[row][column]) ? "" : arr[row][column],
                        value : Array.isArray(arr[row][column]) ? arr[row][column] : [],
                    })

                    xpos += width;
                }
            }
            xpos = 1;
            ypos += height; 
        }
        return data;
    }

    adaptLabelFontSize(d) {
        var xPadding, labelAvailableWidth, labelWidth;
      
        xPadding = 4;
        labelAvailableWidth = d.width - xPadding;
      
        labelWidth = this.getComputedTextLength();
      
        // There is enough space for the label so leave it as is.
        if (labelWidth < labelAvailableWidth) {
          return null;
        }
      
        /*
         * The meaning of the ratio between labelAvailableWidth and labelWidth equaling 1 is that
         * the label is taking up exactly its available space.
         * With the result as `1em` the font remains the same.
         *
         * The meaning of the ratio between labelAvailableWidth and labelWidth equaling 0.5 is that
         * the label is taking up twice its available space.
         * With the result as `0.5em` the font will change to half its original size.
         */
        return (labelAvailableWidth / labelWidth) + 'em';
      }

    // gridData (arr) {
    //     var data = new Array();
    //     var xpos = 1; 
    //     var ypos = 1;
    //     var width = 50;
    //     var height = 50;

    //     for (var row = 0; row < 4; row++) {
    //         data.push( new Array() );
           
    //         for (var column = 0; column < 10; column++) {
    //              data[row].push({
    //                 x: xpos,
    //                 y: ypos,
    //                 width: width,
    //                 height: height,
    //                 text: (column === 0) ? "header" : "",
    //                 value : (column != 0 ) ? [3300,5721,9871,4444] : []
    //             })
    //             xpos += width;
    //         }
    //         xpos = 1;
    //         ypos += height; 
    //     }
    //     return data;
    // }

    renderSVG(arr) {

        const self = this;

        let gridData = this.gridData(arr);	

        const svg = select(`.${app_class}`).append("svg").attr("viewBox", [0, 0, 303, arr.length*50+100]);

        console.log(arr);
        
        var row = svg.selectAll(".row")
            .data(gridData)
            .enter().append("g")
            .attr("class", "row");
            
        row.selectAll(".square")
            .data(function(d) { return d; })
            .enter().append("rect")
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; })
            .attr("width", function(d) { return d.width; })
            .attr("height", function(d) { return d.height; })
            .style("fill", "#fff")
            .style("stroke", "#aaa");
        
        row.selectAll('.label')
            .data(function(d) {return d;}).enter().append("text")
            .attr("x", function(d) { return d.x + 3 })
            .attr("y", function(d) { return d.y +d.height - 10 })
            .text(function(d) {return d.text})
            .style("font-size", this.adaptLabelFontSize)
            .attr("dy", ".35em");


        let scale = scaleLinear()
            .domain([0, 10000])
            .range([0, 48]);

        row.selectAll('.label')
            .data(function(d) {return d;}).enter().append("path")
            .attr("d", function(d, i) { 
                //let points = [[65, 75], [65, 65], [75, 65], [75, 75], [75, 55], [85, 55], [85, 75]]
                //return area().y0(75)(points)})

                let heights = d.value.map(v => scale(v));

                let points = [];
                //push starting point
                if ( heights[0]) {
                    points.push([d.x+5, d.y+d.height]);
                }
                else {
                    points.push([d.x+35, d.y+d.height]);
                }

                heights.forEach((h, i) => {

                    points.push(
                        [d.x + 5 + i*10, d.y + d.height - h],
                        [d.x + 5 + (i+1)*10, d.y + d.height - h],
                        [d.x + 5 + (i+1)*10, d.y + d.height],
                    )
                })

                return area().y0(d.y+d.height)(points)})
            .style("stroke", "grey")
            .style("fill", "indigo")


        //let l = line().curve(curveStep);
        // row.selectAll('.label')
        //     .data(function(d) {return d;}).enter().append("path")
        //     .attr("d", function(d, i) { 
        //         debugger
        //         let points = d.value.map((v, idx) => {
        //             return [d.x + (idx+1) * 10, d.y+d.height - v]
        //         })
        //         return line().curve(curveBasis)(points)})
        //     .style("stroke", "grey")
        //     .style("fill", "none")

            
            
        // let selection = row.selectAll('.chart')
        //     .data(function(d) {return d;}).enter()
        //     .append("rect")
        //     .attr("width", 5)
        //     .attr("height", function(d,i) { if (d.value?.[0]) { return d.height - 10;}})
        //     .attr("x", function(d, i) { return d.x+3 })
        //     .attr("y", function(d, i) { if (d.value?.[0]) { return d.y + d.height - d.value[0]} })
        //     .style("fill", "indigo")
        
        
        
        // selection            
        //     .append("rect")
        //     .attr("width", 5)
        //     .attr("height", function(d,i) { if (d.value?.[0]) { return d.height - 10;}})
        //     .attr("x", function(d, i) { return d.x+ 13 })
        //     .attr("y", function(d, i) { if (d.value?.[0]) { return d.y + d.height - d.value[0]} })
        //     .style("fill", "indigo")

            //.attr("text-anchor","left")
            //.attr("dy",".35em")
            // .text(function(d) {return d.text})
            // .style("stroke", "grey")
            // .style("font-size", "10px")
            
    }

    render(){
        return (
            <div ref={this.myRef}>
            </div>
        );
    }
}

export default PivotBar;
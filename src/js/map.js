import * as us from '../data/us-states.json';
import * as nurses from '../data/nurses.json';
const d3 = require('d3'),
	
	width = 960,
	height = 500,
	
	projection = d3.geo.albersUsa()
		.translate([width/2, height/2])
		.scale([1000]),
		
	path = d3.geo.path()
		.projection(projection),
		
	legends = [
		["Fewer than 10", '#99cfd6', 10],
		["10.1 - 12", '#5ca8b8', 12],
		["12.1 - 14", '#006b83', 14],
		["14.1 - 16", '#13535e', 16],
		["16.1 or more", '#003c42', 1000]
	],
	
	svg = d3.select(".map-wrapper")
		.append("svg")
		.attr("class", "map")
		.attr("viewBox", `0 0 ${width} ${height}`)
		.attr("clipPathUnits", "objectBoundingBox"),
		
	tooltip = d3.select(".map-wrapper")
		.append("div")
		.attr("class", "tooltip")
		.style("opacity", 0),

	legend = d3.select(".tools")
		.append("div")
		.attr("class", "legend"),

	dropdown = d3.select(".tools")
		.append('select')
		.attr("class", "dropdown")

	
// Click outside tooltip

document.addEventListener('click', function(event) {
	var isClickInside = tooltip.node().contains(event.target) || dropdown.node().contains(event.target)

	if(!isClickInside) {
		//clearSelection()
		tooltip.style("display", "none")
	}
});

const data = nurses.default,
	json = us.default

// Merge datasets and prepare data for render

json.features = json.features.map(f => {
	let m = data.find(d => d.state == f.properties.name)
	if(m) {
		f.properties.nurses = m.nurses
		f.properties.pop = m.pop
		f.properties.value = m.nurses / m.pop * 1000
	}
	return f
	})
	.filter(f => f.properties.value)
	.sort((a, b) => a.properties.value < b.properties.value)


// Render SVG map

svg.selectAll("path")
	.data(json.features)
	.enter()
	.append("path")
	.attr("d", path)
	.attr("id", function(d, i){ return 'state-' + i })
	.style("stroke", "#fff")
	.style("stroke-width", "1")
	.style("fill", function(d){
		return legends.find(x => d.properties.value < x[2])[1]
	})
	.on("click", function(d, i) {

		// Populate and move tooltip

		clearSelection()
		d3.select(this).attr("class", "active")

		tooltip
			.html(getLegend(d.properties))
			.style("opacity", 0)
			.style("display", "block")
			
		const canvas = svg.node().getBoundingClientRect(),
			map = d3.select('.map-outer-wrapper').node().getBoundingClientRect(),
			tt = tooltip.node().getBoundingClientRect(),
			c = getBoundingBoxCenter(this),
			t = canvas.width / width,
			lx = map.width - tt.width + (canvas.width - map.width) / 2 - 9,
			ly = canvas.height - tt.height

		c[0] *= t
		c[1] *= t

		if(c[0] > lx) c[0] = lx
		if(c[1] > ly) c[1] = ly

		setTimeout(function(){
			tooltip
				.style("left", c[0] + "px")
				.style("top", c[1] + "px")
				.style("opacity", 1)
				.style("display", "block")
			}, 100)

		dropdown.property('value', d3.select(this).attr('id'))
	})


// Render dropdown

let preventDdLoop = false

json.features.unshift({
	properties: {name: 'Select a state'} // disabled selected
})

dropdown
	.on('change', function() {

		// Trigger path click event

		if(!preventDdLoop) {

			clearSelection()
			tooltip.style("display", "none")

			let id = d3.select(this).property('value')
			const e = document.createEvent('UIEvents')
			e.initUIEvent('click', true, true)
			const obj = svg.select("#" + id).node()
			if(obj) obj.dispatchEvent(e)

			preventDdLoop = true

			setInterval(function() { preventDdLoop = false }, 1000)
		}
	})
		.selectAll("option")
		.data(json.features)
		.enter()
		.append("option")
		.attr("value", function(d, i) { return 'state-' + (i - 1) })
		.html(function(d) { return d.properties.name })
	

// Render legend

legend.append('h3')
	.text("RNs per 1000 population")

const legendList = legend
	.append("ul")
	.attr("width", 200)
	.attr("height", 150)
	.selectAll("li")
	.data(legends)
	.enter()
	.append("li")

legendList.append("div")
	.attr("class", "color")
	.style("background", function(d){ return d[1] })

legendList.append("p")
	.data(legends)
	.text(function(d) { return d[0] })



// Tooltip content

function getLegend(d) {
	return `
		<h2>${d.name}</h2>
		<div><label>Employed RNs in 2020:</label>${parseNumber(d.nurses)}</div>
		<div><label>2019 state population:</label>${parseNumber(d.pop)}</div>
		<div><label>RNs per 1000 population:</label>${d.value.toFixed(1)}</div>
		`
}
function parseNumber(n) {
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
function getBoundingBoxCenter(s) {
	let bbox = s.getBBox()
	return [bbox.x + bbox.width/2, bbox.y + bbox.height/2]
}
function clearSelection(){
	d3.selectAll('.active').attr("class", "");
}
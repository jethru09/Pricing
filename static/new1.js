let selectedIndustry = JSON.parse(localStorage.getItem('selected-industry'));
//console.log(selectedIndustry);
let selectedColumns = [];
let products = [];
const selectedFactors = {};

// Function to update table headers
function updateTableHeaders(selectedColumns, productTableHead) {
    // Create table headers based on selected columns
    const headersHTML = selectedColumns.map(factor => `<th>${factor}</th>`).join('');
    productTableHead.innerHTML = `
        <tr>
            <th>Select</th>
            <th>Product</th>
            ${headersHTML}
            <th>Margin</th>
            <th>Dynamic Price</th>
        </tr>
    `;
}

// Function to update table values
async function updateTableValues(selectedColumns, industry, products, productTableBody) {
    // Fetch and display data for each product
    productTableBody.innerHTML = '';
    for (const product of products) {
        const defaultFactorsResponse = await fetch(`/data/${industry}/${product}`);
        const defaultFactors = await defaultFactorsResponse.json();
        const industry_factors = factors[selectedIndustry];
        const tr = document.createElement('tr');
        const factor1 = industry_factors.indexOf('COG');
        const factor2 = industry_factors.indexOf('Sales Price');
        const factorVal1 = defaultFactors[factor1];
        const factorVal2 = defaultFactors[factor2];
        const Margin = ((factorVal2 - factorVal1)/factorVal2)*100;
        tr.innerHTML = `
            <td><label class="ch">
                    <input type="checkbox" class="product-checkbox" data-product="${industry}-${product}">
                    <span class="checkbox-container"></span>
                </label>
            </td>
            <td>${product}</td>
            ${selectedColumns.map(column => {
                //console.log(column);
                const factorIndex = industry_factors.indexOf(column);
                const factorValue = defaultFactors[factorIndex];
                //console.log(factorIndex);
                //console.log(factorValue);
                return `<td><input type="number" id="${industry}-${product}-${column}" value="${factorValue}"></td>`;
            }).join('')}
            <td><input type="number" id="${industry}-${product}-Margin" placeholder="${Margin.toFixed(2)}"></td>
            <td><input type="number" id="${industry}-${product}-DynamicPrice" placeholder="Enter a value"></td>
        `;
        productTableBody.appendChild(tr);
    }
}

// Function to update the grid layout dynamically
function populateGrid(industry, factors) {
    //console.log(industry);
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';

    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';

    const heading = document.createElement('button');
    heading.className = 'heading';
    heading.textContent = industry;
    gridItem.appendChild(heading);

    const valuesDiv = document.createElement('div');
    valuesDiv.className = 'values';
    //console.log(factors[industry]);
    factors[industry].forEach(factor => {
        const p = document.createElement('p');
        p.innerHTML = `
        <label class="ch">
            <input type="checkbox" class="config-checkbox" data-config="${industry}-${factor}">${factor}
            <span class="checkbox-container"></span>
        </label>
        <hr>`;
        valuesDiv.appendChild(p);
    });

    gridItem.appendChild(valuesDiv);

    const changeDiv = document.createElement('div');
    changeDiv.className = 'changeValues';

    const addFactorBtn = document.createElement('button');
    addFactorBtn.className = 'newColBtn';
    addFactorBtn.id = `${industry}-ColBtn`;
    addFactorBtn.textContent = '+';
    addFactorBtn.addEventListener('click', () => addInputField(industry, valuesDiv));
    changeDiv.appendChild(addFactorBtn);

    const delFactorBtn = document.createElement('button');
    delFactorBtn.className = 'delColBtn';
    delFactorBtn.id = `${industry}-delColBtn`;
    delFactorBtn.textContent = '-';
    delFactorBtn.addEventListener('click', () => {
        let deleteColumns = prompt('Enter columns to delete, comma separated:');
        if (deleteColumns) {
            deleteColumns = deleteColumns.split(',').map(col => col.trim());
            //console.log(deleteColumns);
            deleteColumnsFromIndustry(industry, deleteColumns);
        }
    });
    changeDiv.appendChild(delFactorBtn);

    gridItem.appendChild(changeDiv);
    gridContainer.appendChild(gridItem);


    function addInputField(industry, container) {
        const inputContainer = document.createElement('p');
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter factor';
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                addFactor(industry,event.target.value, inputContainer);
            }
        });
        inputContainer.appendChild(input);
        container.appendChild(inputContainer);
        input.focus();
    }

    function addFactor(industry,value, container) {
        if (value.trim() !== '') {
            container.innerHTML = `
            <label class="ch">
                <input type="checkbox" class="config-checkbox" data-config="${industry}-${value}">${value}
                <span class="checkbox-container"></span>
            </label>
            <hr>`;
            factors[industry] = factors[industry].concat([value]);
            influencing_factors[industry] = influencing_factors[industry].concat([value]);
            // Send the update to the server
            fetch('/update-columns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ industry: industry, columns: value})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Successfully update columns.");
                    //console.log(value);
                } else {
                    alert("Failed to update columns.");
                }
            })
            .catch(error => console.error('Error:', error));
        } else {
            container.remove();
        }
    }

    function deleteColumnsFromIndustry(industry, deleteColumns) {
        fetch('/delete-columns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                industry: industry,
                columns: deleteColumns
            })
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Columns deleted successfully!');
                location.reload();
            } else {
                alert('Failed to delete columns.');
            }
        });
    }    
}

function updateSelectedColumns() {
    selectedColumns = getSelectedFactors(selectedIndustry)[selectedIndustry];
    const productTableHead = document.getElementById('product-table').querySelector('thead');
    const productTableBody = document.getElementById('product-table').querySelector('tbody');
    
    updateTableHeaders(selectedColumns, productTableHead);
    updateTableValues(selectedColumns, selectedIndustry, products, productTableBody);
}

// Adding event listener to checkboxes to update selected columns
document.addEventListener('change', function(event) {
    if (event.target.classList.contains('config-checkbox')) {
        updateSelectedColumns();
    }
});

document.getElementById('industry-select').addEventListener('change', async function() {
    const industrySelect = document.getElementById('industry-select');
    selectedIndustry = industrySelect.value;
    localStorage.setItem('selected-industry', JSON.stringify(selectedIndustry));

    selectedFactors[selectedIndustry] = selectedColumns;

    const mainContentDiv = document.querySelector('.content');
    const productTableHead = document.getElementById('product-table').querySelector('thead');
    const productTableBody = document.getElementById('product-table').querySelector('tbody');
    productTableHead.innerHTML = '';
    productTableBody.innerHTML = '';
    populateGrid(selectedIndustry, factors);
    const industry_factors = factors[selectedIndustry];
    if (selectedIndustry && industry_factors) {
        const productsResponse = await fetch(`/data/${selectedIndustry}`);
        products = await productsResponse.json();

        if (products.error) {
            alert(products.error);
            return;
        }
        updateSelectedColumns();
    }
    showGraph();
});

function getInputValue(id, defaultValue) {
    const inputElement = document.getElementById(id);
    if (inputElement) {
        const value = inputElement.value;
        return value ? parseFloat(value) : defaultValue;
    }
    return defaultValue;
}


async function calculateDynamicPrices(industry) {
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');

    for (const checkbox of checkboxes) {
        const product = checkbox.getAttribute('data-product'); // Gives I1-p1 actual product is p1
        const defaultFactorsResponse = await fetch(`/data/${industry}/${product.split('-')[1]}`);
        const defaultFactors = await defaultFactorsResponse.json();
        //console.log(defaultFactors);
        // Retrieve factor values dynamically
        const factorValues = factors[industry].reduce((acc, factor, index) => {
            const id = `${product}-${factor}`;
            const elementExists = !!document.getElementById(id);
            //console.log(`Checking ID: ${id}, Element exists: ${elementExists}`); // Log the ID and its existence

            // Use the default value from defaultFactors if the element does not exist
            // Assuming defaultFactors is an array, use index to access the values
            acc[factor] = elementExists ? getInputValue(`${product}-${factor}`) : defaultFactors[index];
            //console.log(`Value for ${factor}:`, acc[factor]);
            //console.log(`Default value for ${factor}:`, defaultFactors[index]);
            return acc;
        }, {});

        let dynamicPrice = 0;
        let SP = factorValues['Sales Price'];
        //console.log(SP);
        let COG = factorValues['COG'];
        let prevMargin = ((SP - COG)/SP)*100;
        let margin =  getInputValue(`${product}-Margin`,prevMargin);
        let change = margin - prevMargin;
        //console.log(change);
        const weights = await getCoefficients(industry, product.split('-')[1]);
        // Add the constant term to dynamic price
        //console.log(weights.const);
        //console.log(weights);
        if (weights.const !== undefined) {
            dynamicPrice += parseFloat(weights.const);
        }
        // Iterate over each factor to calculate the dynamic price
        for (const factor of influencing_factors[industry]) {
            if (weights[factor] !== undefined) {
                dynamicPrice += weights[factor] * parseFloat(factorValues[factor]);
                //console.log(factorValues[factor]);
                //console.log(factor)
            }
        }
        dynamicPrice = 1/( (1/dynamicPrice) - (change/(100*COG)) );
        // Update the Dynamic Price input field for the product
        const dynamicPriceElement = document.getElementById(`${product}-DynamicPrice`);
        const marginElement = document.getElementById(`${product}-Margin`);
        const id2 = `${product}-Margin`;
        const id1 = `${product}-DynamicPrice`;
        const Exists = !!document.getElementById(id1);
        //console.log(`Checking ID: ${id1}, Element exists: ${Exists}`); // Log the ID and its existence

        if (dynamicPriceElement && marginElement) {
            marginElement.value = margin.toFixed(2);
            dynamicPriceElement.value = dynamicPrice.toFixed(2);
        }
    }
}

async function getCoefficients(industry, product) {
    try {
        let response = await fetch(`/coefficients/${industry}/${product}`);
        let data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching coefficients:', error);
        return null;
    }
}
// Periodically check for updates and calculate dynamic prices

setInterval(async () => {
    let selectedFactors = JSON.parse(localStorage.getItem('selectedFactors'));
    if(getSelectedFactors(industries) !== ''){
        selectedFactors = getSelectedFactors(industries);
        localStorage.setItem('selectedFactors', JSON.stringify(selectedFactors));
    }
    const selectedColumns = selectedFactors[selectedIndustry];
    
    // Clear existing content in main-content div
    const productTableHead = document.getElementById('product-table').querySelector('thead');
    const productTableBody = document.getElementById('product-table').querySelector('tbody');
    const productsResponse = await fetch(`/data/${selectedIndustry}`);
    const products = await productsResponse.json();
    productTableBody.innerHTML = '';  // Clear table values
    updateTableHeaders(selectedColumns, productTableHead);
    updateTableValues(selectedColumns, selectedIndustry, products, productTableBody);
    
    const checkboxes = document.querySelectorAll('.product-checkbox:checked');
    checkboxes.forEach(checkbox => {
        const product = checkbox.getAttribute('data-product').split('-')[1];
        getCoefficients(selectedIndustry, product);
    });
}, 300000);

// Function to get selected factors on button click
function getSelectedFactors(industry) {
    const selectedFactors = {};
    selectedFactors[industry] = [];

    const checkboxes = document.querySelectorAll('.config-checkbox:checked');
    checkboxes.forEach(checkbox => {
        const [industry, factor] = checkbox.getAttribute('data-config').split('-');
        selectedFactors[industry].push(factor);
    });

    return selectedFactors;
}


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("simulate-btn").addEventListener('click', async function() {
        calculateDynamicPrices(selectedIndustry);
    });
    const industrySelect = document.getElementById('industry-select');
    // Modal functionality
    industries.forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry;
        industrySelect.appendChild(option);
    });
    //console.log(selectedIndustry);
// Call the function to populate the grid
    populateGrid(selectedIndustry, factors);


    document.getElementById('configurator-btn').addEventListener('click', () =>{
        // Redirect to the app.route('/') page
        window.location.href = '/';
    });

    document.getElementById('analyzer-btn').addEventListener('click', () => {
        const selectedFactors = getSelectedFactors(industries);
        //console.log(selectedFactors); // You can handle this dictionary as needed
        // Redirect to the app.route('/') page
        window.location.href = '/analyze';
    });

});



async function showGraph() {
    const productSelect = document.getElementById('product-select');

    try {
        const productsResponse = await fetch(`/data/${selectedIndustry}`);
        if (!productsResponse.ok) {
            throw new Error('Network response was not ok');
        }
        const products = await productsResponse.json();
        //console.log('Products:', products); // Debug: Log the products data

        // Clear the graph
        const ctx = document.getElementById("lineChart").getContext("2d");
        if (window.lineChart instanceof Chart) {
            window.lineChart.data.labels = [];
            window.lineChart.data.datasets = [];
            window.lineChart.update();
        }

        const ctx2 = document.getElementById("lineChart2").getContext("2d");
        if (window.lineChart2 instanceof Chart) {
            window.lineChart2.data.labels = [];
            window.lineChart2.data.datasets = [];
            window.lineChart2.update();
        }
        // Populate the product dropdown
        productSelect.innerHTML = '<option value="">--Select a Product--</option>'; // Reset options
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            productSelect.appendChild(option);
        });

        // Event listener for product selection
        productSelect.addEventListener('change', async () => {
            const selectedProduct = productSelect.value;
            if (!selectedProduct) {
                console.error('Selected product is not set.');
                return;
            }
            
            const url = `/coefficients/${selectedIndustry}/${selectedProduct}`;
            const url2 = `/sales_trend/${selectedIndustry}/${selectedProduct}`;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                //console.log('Graph data:', data); // Debug: Log the graph data

                // Extract labels and values from the feature importance data
                const df = data;
                const filteredData = Object.entries(df).filter(([key, value]) => !key.startsWith("const"));
                const labels = filteredData.map(([key, value]) => key);
                const values = filteredData.map(([key, value]) => value);

                // Create the chart
                const ctx = document.getElementById("lineChart").getContext("2d");
                if (window.lineChart instanceof Chart) {
                    window.lineChart.destroy();
                }
                window.lineChart = new Chart(ctx, {
                    type: "line", // Changed to "bar" since the data suggests it might be more appropriate than "line"
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Feature Importance",
                                data: values,
                                backgroundColor: "rgba(75, 192, 192, 0.2)",
                                borderColor: "rgba(75, 192, 192, 1)",
                                borderWidth: 1,
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: false, // Set to false to use the specified width and height
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 0.1,
                                    font: {
                                        size: 10 // Adjust font size for y-axis
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Importance',
                                    font: {
                                        size: 12 // Adjust font size for y-axis title
                                    }
                                }
                            },
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    autoSkip: false,
                                    font: {
                                        size: 10 // Adjust font size for x-axis
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Factors',
                                    font: {
                                        size: 12 // Adjust font size for x-axis title
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    font: {
                                        size: 15 // Adjust font size for legend labels
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error fetching graph data:', error);
            }
            try {
                const response = await fetch(url2, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                //console.log('Graph data:', data); // Debug: Log the graph data

                // Extract labels and values from the yearly trend data
                const labels = data.map(entry => entry.Year);
                const values = data.map(entry => entry[`Sales Price`]);
                //console.log(labels);
                //console.log(values);
                // Create the chart
                const ctx2 = document.getElementById("lineChart2").getContext("2d");
                if (window.lineChart2 instanceof Chart) {
                    window.lineChart2.destroy();
                }
                window.lineChart2 = new Chart(ctx2, {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Yearly Sales Price Trend",
                                data: values,
                                backgroundColor: "rgba(75, 192, 192, 0.2)",
                                borderColor: "rgba(75, 192, 192, 1)",
                                borderWidth: 1,
                                pointRadius: 0
                            }
                        ]
                    },
                    options: {
                        responsive: false, // Set to false to use the specified width and height
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 5,
                                    font: {
                                        size: 10 // Adjust font size for y-axis
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Sales Price',
                                    font: {
                                        size: 12 // Adjust font size for y-axis title
                                    }
                                }
                            },
                            x: {
                                beginAtZero: true,
                                ticks: {
                                    autoSkip: false,
                                    font: {
                                        size: 10 // Adjust font size for x-axis
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Year',
                                    font: {
                                        size: 12 // Adjust font size for x-axis title
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                labels: {
                                    font: {
                                        size: 10 // Adjust font size for legend labels
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error fetching graph data:', error);
            }
        });

    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

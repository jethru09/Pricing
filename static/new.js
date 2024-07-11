// Function to update the grid layout dynamically
function populateGrid(industries, factors) {
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';
    if (!Array.isArray(industries)) {
        industries = [industries];
    }
    industries.forEach(industry => {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';

        const heading = document.createElement('button');
        heading.className = 'heading';
        heading.textContent = industry;
        gridItem.appendChild(heading);

        const valuesDiv = document.createElement('div');
        valuesDiv.className = 'values';

        factors[industry].forEach(factor => {
            const p = document.createElement('p');
            p.innerHTML = `
            <p>${factor}</p>
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
    });

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
            <p>${value}</p>
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

document.addEventListener('DOMContentLoaded', () => {
// Call the function to populate the grid
    const industrySelect = document.getElementById('industry-select');

    document.getElementById('industry-select').addEventListener('change', async function() {
        const industry = this.value;
        populateGrid(industry, factors);
        localStorage.setItem('selected-industry', JSON.stringify(industry));
        //console.log(industry);
    });

    document.getElementById('configurator-btn').addEventListener('click', () =>{
        // Redirect to the app.route('/') page
        window.location.href = '/';
    });

    document.getElementById('analyzer-btn').addEventListener('click', () => {
        //console.log(selectedFactors); // You can handle this dictionary as needed
        //console.log( JSON.parse(localStorage.getItem('selected-industry')))
        // Store selectedFactors in localStorage
        // Redirect to the app.route('/') page
        window.location.href = '/analyze';
    });

    // Modal functionality
    const modal = document.getElementById('myModal');
    const newIndustry = document.getElementById('add-btn');
    const closeBtns = document.querySelectorAll('.close');
    const newIndustryBtn = document.getElementById('new-industry-btn');
    const newIndustryForm = document.getElementById('new-industry-form');
    const applyNewIndustry = document.getElementById('apply-new-industry');
    const csvFileInput = document.getElementById('csv-file');
    const dropArea = document.getElementById('drop-area');
    const delIndustryBtn = document.getElementById('delete-industry-btn');
    const delIndustryForm = document.getElementById('delete-industry-form');
    const deleteSelectIndustry = document.getElementById('Change-select-industry');
    const deleteIndustrySelect = document.getElementById('delete-industry-select');

    industries.forEach(industry => {
        const option = document.createElement('option');
        option.value = industry;
        option.textContent = industry;
        industrySelect.appendChild(option);

        const deleteOption = document.createElement('option');
        deleteOption.value = industry;
        deleteOption.textContent = industry;
        deleteIndustrySelect.appendChild(deleteOption);
    });

    newIndustry.addEventListener("click", function() {
        modal.style.display = "block";
        //console.log("zro");
    });
    

    closeBtns.forEach(btn => {
        btn.onclick = function() {
            modal.style.display = "none";
            newIndustryForm.style.display = "none";
            delIndustryForm.style.display = "none";
        }
    });

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            newIndustryForm.style.display = "none";
            delIndustryForm.style.display = "none";
        }
    }

    newIndustryBtn.onclick = function() {
        newIndustryForm.style.display = "block";
        delIndustryForm.style.display = "none";
    }

    delIndustryBtn.onclick = function() {
        newIndustryForm.style.display = "none";
        delIndustryForm.style.display = "block";
    }

    function handleFiles(files) {
        const industryName = document.getElementById('industry-name').value;
        if (files.length > 0 && industryName) {
            const formData = new FormData();
            formData.append('csvFile', files[0]);
            formData.append('industryName', industryName);
            fetch('/upload-csv', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('CSV file uploaded successfully.');
                } else {
                    alert('Failed to upload CSV file.');
                }
            })
            .catch(error => console.error('Error:', error));
        } else {
            alert('Please enter an industry name and select a CSV file.');
        }
    }

    csvFileInput.addEventListener('change', (event) => {
        handleFiles(event.target.files);
    });

    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.style.background = '#e9e9e9';
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.style.background = '';
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.style.background = '';
        const files = event.dataTransfer.files;
        handleFiles(files);
    });

    applyNewIndustry.onclick = function() {
        const industryName = document.getElementById('industry-name').value;
        const columns = document.getElementById('columns').value.split(',').map(col => col.trim());
        const target_var = document.getElementById('target').value;
        if (industries.includes(industryName)){
            alert("Failed to add industry. " + industryName + " industry already exists.");
        }
        else if (industryName && columns.length) {
            fetch('/update-industries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ new_industry: industryName, columns: columns, inF: columns, target_var: target_var})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    industries.push(industryName);
                    factors[industryName] = [target_var, ...columns];
                    influencing_factors[industryName] = columns;
                    populateGrid(industries, factors);

                    // Add new option to the industry select
                    const option = document.createElement('option');
                    option.value = industryName;
                    option.textContent = industryName;
                    industrySelect.appendChild(option);
                    const deleteOption = document.createElement('option');
                    deleteOption.value = industryName;
                    deleteOption.textContent = industryName;
                    deleteIndustrySelect.appendChild(deleteOption);
                    modal.style.display = "none";
                    const newIndustry = document.getElementById('add-btn');
                    newIndustry.addEventListener("click", function() {
                        modal.style.display = "block";
                    });
                } else {
                    alert("Failed to add industry.");
                }
            })
            .catch(error => console.error('Error:', error));
        } else {
            alert("Please enter an industry name and at least one column name.");
        }
    };

    deleteSelectIndustry.onclick = function() {
        const selectedIndustry = deleteIndustrySelect.value;
        // If no columns are specified, delete the entire industry after confirmation
        //console.log("entered the else statement");
        var confirmation = confirm(`This will delete the entire ${selectedIndustry} industry data files. Are you sure?`);
        if (confirmation) {
            fetch('/delete-industry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    industry: selectedIndustry
                })
            }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Industry deleted successfully!');
                    modal.style.display = 'none';
                    const indexToRemove = industries.indexOf(selectedIndustry);
                    //console.log(industries);
                    if (indexToRemove !== -1) {
                        industries.splice(indexToRemove, 1);
                        //console.log(industries);
                    }
                    // factors and influencing_factors are objects (dictionaries)
                    delete factors[selectedIndustry];
                    delete influencing_factors[selectedIndustry];
                    populateGrid(industries, factors);
                    for (let i = 0; i < industrySelect.options.length; i++) {
                        if (industrySelect.options[i].value === selectedIndustry) {
                            industrySelect.remove(i);
                            deleteIndustrySelect.remove(i);
                            break; // Exit the loop once the option is removed
                        }
                    }
                    const newIndustry = document.getElementById('add-btn');
                    newIndustry.addEventListener("click", function() {
                        modal.style.display = "block";
                        //console.log("zro");
                    });
                } else {
                    alert('Failed to delete industry.');
                }
            });
        }
    }
});

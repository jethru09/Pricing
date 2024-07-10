from flask import Flask, render_template, jsonify, make_response, request, session, send_from_directory
import os
import re
import shutil
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
import hashlib
from werkzeug.utils import secure_filename
from urllib.parse import unquote

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'data'

# Allow cross-origin requests for development purposes
from flask_cors import CORS
CORS(app)

data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

# -----------------------------------------------   python utility definitions -----------------------------------------------

def return_response(*Value):
    if len(Value) > 1:
        response = make_response(Value[0], Value[1])
    else:
        response = make_response(Value[0])
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    return response 

def get_industries():
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    industries = [name for name in os.listdir(data_path) if os.path.isdir(os.path.join(data_path, name))]
    return industries

def load_factors_and_influencing_factors():
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    industries = get_industries()
    
    factors = {}
    influencing_factors = {}
    target_variable = {}
    
    for industry in industries:
        industry_path = os.path.join(data_path, industry)
        csv_files = [f for f in os.listdir(industry_path) if f.endswith('.csv')]
        
        all_columns = set()
        # for csv_file in csv_files:
        file_path = os.path.join(industry_path, csv_files[0])
        df = pd.read_csv(file_path)

        # Select columns with numeric types only (integers and floats)
        numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
        # Exclude datetime-like columns explicitly
        non_date_numeric_cols = [col for col in numeric_cols if not pd.api.types.is_datetime64_any_dtype(df[col])]
        all_columns.update(non_date_numeric_cols)

        all_columns = list(all_columns)
        if 'Sales Price' in all_columns:
            influencing_columns = [col for col in all_columns if col != 'Sales Price']
            factors[industry] = ['Sales Price'] + influencing_columns
            influencing_factors[industry] = influencing_columns
            target_variable[industry] = 'Sales Price'
        else:
            factors[industry] = all_columns
            influencing_factors[industry] = all_columns
            target_variable[industry] = 'Sales Price'  # Or handle the absence of 'Sales Price' appropriately

    return factors, influencing_factors, target_variable

# Generate the dictionaries
factors, influencing_factors, target_variable = load_factors_and_influencing_factors()

# Dictionary to store the last hash of each file and the corresponding coefficients
file_hashes = {}
coefficients = {}

def calculate_file_hash(file_path):
    with open(file_path, 'rb') as f:
        file_hash = hashlib.md5()
        while chunk := f.read(8192):
            file_hash.update(chunk)
    return file_hash.hexdigest()

def get_ridge_coefficients(df, industry):
    X = df[influencing_factors[industry]]
    y = df[target_variable[industry]]
    model = Ridge()
    model.fit(X, y)
    coefs = model.coef_
    const_coef = model.intercept_
    return coefs, const_coef

# Global list to keep track of industries
changed_industries = get_industries()

def custom_secure_filename(filename):
    filename = re.sub(r'[^a-zA-Z0-9\s_.-]', '', filename).strip()
    filename = re.sub(r'\s+', ' ', filename)
    return filename

def update_factors_and_influencing_factors(industry, file_path):
    df = pd.read_csv(file_path)
    numeric_columns = df.select_dtypes(include=['float64', 'int64']).columns.tolist()
    non_date_numeric_cols = [col for col in numeric_columns if not pd.api.types.is_datetime64_any_dtype(df[col])]
    target_var = 'Sales Price'  # Default target variable

    # Update the dictionaries
    factors[industry] = [target_var] + non_date_numeric_cols
    influencing_factors[industry] = non_date_numeric_cols
    target_variable[industry] = target_var


# -----------------------------------------------   Flask Route definitions -----------------------------------------------

@app.route('/', methods=['GET', 'POST'])
def iex():
    global changed_industries
    industries = changed_industries if changed_industries else get_industries()
    return render_template('new.html',  industries=industries, factors=factors, influencing_factors=influencing_factors)

@app.route('/analyze')
def index():
    global changed_industries
    industries = changed_industries if changed_industries else get_industries()
    return render_template('new1.html', industries=industries, factors=factors, influencing_factors=influencing_factors)

@app.route('/update-industries', methods=['POST'])
def update_industries():
    global changed_industries
    new_industry = request.json.get('new_industry')
    columns = request.json.get('columns')
    inF= request.json.get('inF')  ## inF is influencing factors.
    target_var = request.json.get('target_var')
    if new_industry and columns:
        changed_industries.append(new_industry)
        factors[new_industry] = [target_var] + columns
        influencing_factors[new_industry] = inF
        return {'success': True}
    return {'success': False}, 400

@app.route('/upload-csv', methods=['POST'])
def upload_csv():
    if 'csvFile' not in request.files:
        return jsonify(success=False, message="No file part")
    file = request.files['csvFile']
    if file.filename == '':
        return jsonify(success=False, message="No selected file")
    
    industry_name = request.form.get('industryName')
    if not industry_name:
        return jsonify(success=False, message="No industry name provided")
    
    # Use custom_secure_filename for the industry name
    industry_name = custom_secure_filename(industry_name)
    
    # Create directory if it doesn't exist
    industry_path = os.path.join(app.config['UPLOAD_FOLDER'], industry_name)
    if not os.path.exists(industry_path):
        os.makedirs(industry_path)
    
    # Save the file
    filename = custom_secure_filename(file.filename)
    file_path = os.path.join(industry_path, filename)
    file.save(file_path)

    # Update the factors and influencing factors for the new industry
    update_factors_and_influencing_factors(industry_name, file_path)
    
    return jsonify(success=True, message="File uploaded successfully")

@app.route('/update-columns', methods=['POST'])
def update_columns():
    global factors
    data = request.json
    industry = data.get('industry')
    new_column = data.get('columns')  ##  same for the inF, which is influencing_factors[selectedIndustry].
    if industry and new_column:
        if industry in factors:
            existing_columns = set(factors[industry])
            if new_column not in existing_columns:
                factors[industry].append(new_column)
                influencing_factors[industry].append(new_column)
        else:
            gl_target_var = ['Sales Price']
            factors[industry] = gl_target_var + new_column
            influencing_factors[industry] = new_column
        return {'success': True}
    return {'success': False}, 400

@app.route('/delete-columns', methods=['POST'])
def delete_columns():
    data = request.json
    industry = data.get('industry')
    columns_to_delete = data.get('columns')
    
    if industry not in factors:
        return jsonify(success=False, message="Industry does not exist")
    
    if columns_to_delete:
        factors[industry] = [col for col in factors[industry] if col not in columns_to_delete]
        influencing_factors[industry] = [col for col in influencing_factors[industry] if col not in columns_to_delete]
    else:
        return jsonify(success=False, message="No columns specified for deletion")
    
    return jsonify(success=True)

@app.route('/delete-industry', methods=['POST'])
def delete_industry():
    global changed_industries
    data = request.json
    industry = data.get('industry')
    
    if industry not in factors:
        return jsonify(success=False, message="Industry does not exist")
    
    industries = get_industries()
    industries.remove(industry)
    changed_industries.remove(industry)
    factors.pop(industry, None)
    influencing_factors.pop(industry, None)
    
    # Delete industry directory
    industry_dir = os.path.join(data_dir, industry)
    if os.path.exists(industry_dir):
        shutil.rmtree(industry_dir)
    
    return jsonify(success=True)

@app.route('/data/<industry>', methods=['GET'])
def get_products(industry):
    data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', industry)
    try:
        products = [f.split('.')[0] for f in os.listdir(data_path) if f.endswith('.csv')]
        response = return_response(jsonify(products))
        return response
    except FileNotFoundError:
        response = return_response(jsonify({"error": f"Industry directory {industry} not found"}), 404)
        return response

@app.route('/data/<industry>/<product>', methods=['GET'])
def get_default_factors(industry, product):
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', industry, f'{product}.csv')
    try:
        df = pd.read_csv(file_path)
        factors_val = factors.get(industry, [])
        numeric_df = df[factors_val].iloc[-30:].copy()
        df_mean = numeric_df.mean()  # Get the last 30 rows
        default_factors = [round(df_mean[factor].item(), 2) if isinstance(df_mean[factor], (np.integer, np.floating)) else df_mean[factor] for factor in factors_val if factor in df_mean]
        response = return_response(jsonify(default_factors))
        return response
    except FileNotFoundError:
        response = return_response(jsonify({"error": f"Product file {product}.csv not found in {industry}"}), 404)
        return response
    except Exception as e:
        response = return_response(jsonify({"error": str(e)}), 500)
        return response


@app.route('/coefficients/<industry>/<product>', methods=['GET', 'POST'])
def get_coefficients(industry, product):
    industry = unquote(industry)  # Decode the industry name

    file_path = os.path.join(data_dir, industry, f'{product}.csv')
    
    try:
        current_hash = calculate_file_hash(file_path)
        
        if file_path not in file_hashes or file_hashes[file_path] != current_hash:
            df = pd.read_csv(file_path)

            if industry not in influencing_factors:
                raise KeyError(f"Industry '{industry}' not found in influencing_factors")

            coefs, const_coef = get_ridge_coefficients(df, industry)
            coefficients[(industry, product)] = dict(zip(influencing_factors[industry], coefs))
            coefficients[(industry, product)]['const'] = const_coef  # Add the constant term to the coefficients
            file_hashes[file_path] = current_hash
        
        response = return_response(jsonify(coefficients[(industry, product)]))
        return response
    except FileNotFoundError:
        response = return_response(jsonify({"error": f"Product file {product}.csv not found in {industry}"}), 404)
        return response
    except KeyError as ke:
        response = return_response(jsonify({"error": str(ke)}), 400)
        return response
    except Exception as e:
        response = return_response(jsonify({"error": str(e)}), 500)
        return response

@app.route('/sales_trend/<industry>/<product>', methods=['POST'])
def sales_trend(industry, product):
    industry = unquote(industry)  # Decode the industry name

    file_path = os.path.join(data_dir, industry, f'{product}.csv')
    try:
        df = pd.read_csv(file_path)
        # Group by Year and calculate average Sales Price
        trend_data = df.groupby('Year')['Sales Price'].mean().reset_index()

        # Convert to dictionary for JSON response
        trend_dict = trend_data.to_dict(orient='records')
        
        return jsonify(trend_dict)
    except Exception as e:
        response = return_response(jsonify({"error": str(e)}), 400)
        return response


# Run the Flask app
if __name__ == '__main__':
    app.run(debug=True)
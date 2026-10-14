import argparse
import csv
import datetime
import math
import random
import os
import sys

def generate(n_days: int = 365, seed: int = 42) -> list:
    random.seed(seed)
    start = datetime.date.today() - datetime.timedelta(days=n_days)

    records = []
    for i in range(n_days):
        d = start + datetime.timedelta(days=i)
        month = d.month
        dow = d.weekday()

        base = 10.0

        if dow >= 5:
            base *= 1.15

        seasonal = 1.0 + 0.25 * math.sin(2 * math.pi * (month - 4) / 12)
        base *= max(0.8, seasonal)

        noise = random.gauss(0, 0.8)
        kwh = max(0.1, round(base + noise, 3))

        if random.random() < 0.04:
            kwh = round(kwh * random.uniform(2.5, 4.0), 3)

        records.append({
            'date': d.isoformat(),
            'kWh': kwh,
            'meterId': 'main',
            'category': 'residential',
            'notes': 'SAMPLE_DATA_NOT_REAL',
        })

    return records

def write_csv(records: list, output_path: str):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'kWh', 'meterId', 'category', 'notes'])
        writer.writeheader()
        writer.writerows(records)
    print(f"[sample_gen] Written {len(records)} rows to {output_path}")
    print("[sample_gen] WARNING: This is synthetic data for demonstration — NOT real measurements.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=365)
    parser.add_argument('--output', type=str, default='data/raw/sample_energy.csv')
    parser.add_argument('--seed',  type=int, default=42)
    args = parser.parse_args()
    records = generate(args.days, args.seed)
    write_csv(records, args.output)

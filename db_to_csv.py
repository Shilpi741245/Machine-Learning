import sqlite3
import csv

# Connect to the database
conn = sqlite3.connect('chat.db')
cursor = conn.cursor()

# Execute the query
cursor.execute("SELECT * FROM chat_messages")

# Get the data
rows = cursor.fetchall()

# Get the column names
column_names = [description[0] for description in cursor.description]

# Write data to a CSV file
with open('output.csv', 'w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(column_names)
    writer.writerows(rows)

# Close the connection
conn.close()

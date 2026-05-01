# VCDS Log Viewer
https://maykello.github.io/VCDS-LogViewer/
Web-based tool for analyzing VCDS (VAG-COM) diagnostic logs. It provides interactive charts, performance statistics, and an acceleration calculator.

## Features

- **Interactive Charts**: Visualize multiple engine parameters simultaneously using high-performance Plotly.js charts.
- **Smart Parsing**: Supports VCDS `.CSV` logs with automatic header detection and encoding handling (Windows-1250).
- **Performance Statistics**:
  - **V-MAX**: Automatically extracts the maximum speed reached during the logging session.
  - **Peak Efficiency**: Displays the maximum fuel injection quantity and the corresponding boost pressure.
- **Acceleration Calculator**:
  - Custom range calculation (e.g., 0-100 km/h, 100-200 km/h, 80-120 km/h).
  - Only works with logs that contain speed and throtle position data. It will measure time from the first point where the 
    throtle is open to the last point where the throtle is closed. Remember that you have to perform acceleration with full throttle.

## How to use

1. Open `index.html` in any modern web browser.
2. Click **"Upload VCDS CSV Log"** in the sidebar.
3. Select the parameters you want to visualize from the generated list.
4. Review the calculated statistics in the top panel.
5. Use the **Acceleration Calculator** to measure your car's performance for specific speed ranges.

## Supported Formats

- Standard VCDS `.CSV` export files.
- Works with both English and Polish versions of VCDS logs

## Technologies

- **HTML5 & Vanilla CSS3** (Custom design system)
- **Vanilla JavaScript** (ES6+)
- **Plotly.js** for interactive data visualization

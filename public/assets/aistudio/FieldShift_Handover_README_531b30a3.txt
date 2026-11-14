
FIELDSHIFT TECHNICAL HANDOVER
NASA SPACE APPS CHALLENGE 2026

CONTENTS
This package contains the exported environmental, crop suitability,
rotation recommendation, data dictionary and methodology files.

MAIN INTERFACE FILE
FieldShift_Final_Grouped_Recommendations.csv

This file contains 21 unique crop combinations, their best
provisional scores, alternative sequences and explanations.

DETAILED ROTATION FILE
FieldShift_Final_Rotation_Recommendations.csv

This file contains 42 individual ordered rotation sequences
and their component screening scores.

IMPORTANT
The scores are provisional screening indicators, not yield
predictions or probabilities of successful cultivation.

Alternative orders of the same three crops receive the same
score because the current model evaluates average crop-level
characteristics rather than planting-order effects.

Heat, water and growing-season categories require agronomic
validation. Local planting calendars, irrigation availability,
water quality and field-level suitability must be assessed.

The NDVI result is based on a small search area around the
demonstration coordinates, not a verified farm boundary.
Sentinel-2 SCL cloud and shadow masking was applied.

GPM and NASA POWER rainfall estimates differ substantially
and require validation against ground observations.

REPRODUCIBILITY
The analysis notebook should be shared separately.
Re-running the complete workflow may require the original
GAEZ source Excel workbooks, internet access and Google
Earth Engine authentication and project configuration.

These files are exported analytical results for the project
team and interface integration.

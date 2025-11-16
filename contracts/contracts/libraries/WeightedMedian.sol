// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WeightedMedian
 * @notice Library for calculating weighted median consensus
 * @dev Implements stake-weighted median algorithm for validator consensus
 */
library WeightedMedian {
    struct WeightedValue {
        uint256 value;
        uint256 weight;
        address validator;
    }

    /**
     * @notice Calculate weighted median from an array of values and weights
     * @param values Array of values
     * @param weights Array of corresponding weights (stakes)
     * @return median The weighted median value
     */
    function calculate(
        uint256[] memory values,
        uint256[] memory weights
    ) internal pure returns (uint256 median) {
        require(values.length == weights.length, "Length mismatch");
        require(values.length > 0, "Empty arrays");

        // Create array of weighted values
        WeightedValue[] memory weightedValues = new WeightedValue[](values.length);
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < values.length; i++) {
            weightedValues[i] = WeightedValue({
                value: values[i],
                weight: weights[i],
                validator: address(0)
            });
            totalWeight += weights[i];
        }

        // Sort by value (insertion sort - efficient for small arrays)
        _insertionSort(weightedValues);

        // Find median by cumulative weight
        uint256 cumulativeWeight = 0;
        uint256 medianThreshold = totalWeight / 2;

        for (uint256 i = 0; i < weightedValues.length; i++) {
            cumulativeWeight += weightedValues[i].weight;
            if (cumulativeWeight >= medianThreshold) {
                median = weightedValues[i].value;
                break;
            }
        }
    }

    /**
     * @notice Calculate weighted median with validator addresses
     * @param values Array of values
     * @param weights Array of corresponding weights
     * @param validators Array of validator addresses
     * @return median The weighted median value
     * @return medianValidator Address of validator at median position
     */
    function calculateWithValidator(
        uint256[] memory values,
        uint256[] memory weights,
        address[] memory validators
    ) internal pure returns (uint256 median, address medianValidator) {
        require(values.length == weights.length && values.length == validators.length, "Length mismatch");
        require(values.length > 0, "Empty arrays");

        WeightedValue[] memory weightedValues = new WeightedValue[](values.length);
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < values.length; i++) {
            weightedValues[i] = WeightedValue({
                value: values[i],
                weight: weights[i],
                validator: validators[i]
            });
            totalWeight += weights[i];
        }

        _insertionSort(weightedValues);

        uint256 cumulativeWeight = 0;
        uint256 medianThreshold = totalWeight / 2;

        for (uint256 i = 0; i < weightedValues.length; i++) {
            cumulativeWeight += weightedValues[i].weight;
            if (cumulativeWeight >= medianThreshold) {
                median = weightedValues[i].value;
                medianValidator = weightedValues[i].validator;
                break;
            }
        }
    }

    /**
     * @notice Normalize weights to sum to a target value (e.g., 65535 for u16)
     * @param weights Array of weights
     * @param targetSum Target sum value
     * @return normalized Array of normalized weights
     */
    function normalizeWeights(
        uint256[] memory weights,
        uint256 targetSum
    ) internal pure returns (uint256[] memory normalized) {
        require(weights.length > 0, "Empty array");
        
        normalized = new uint256[](weights.length);
        uint256 sum = 0;

        for (uint256 i = 0; i < weights.length; i++) {
            sum += weights[i];
        }

        if (sum == 0) {
            // Equal distribution if all weights are zero
            uint256 equalWeight = targetSum / weights.length;
            for (uint256 i = 0; i < weights.length; i++) {
                normalized[i] = equalWeight;
            }
        } else {
            // Normalize proportionally
            for (uint256 i = 0; i < weights.length; i++) {
                normalized[i] = (weights[i] * targetSum) / sum;
            }
        }
    }

    /**
     * @notice Clip outliers using IQR method
     * @param values Array of values to clip
     * @return clipped Array with outliers clipped
     */
    function clipOutliers(uint256[] memory values) internal pure returns (uint256[] memory clipped) {
        if (values.length < 4) return values;

        clipped = new uint256[](values.length);
        uint256[] memory sorted = new uint256[](values.length);
        
        // Copy and sort
        for (uint256 i = 0; i < values.length; i++) {
            sorted[i] = values[i];
        }
        _quickSort(sorted, 0, int256(sorted.length - 1));

        // Calculate Q1, Q3, IQR
        uint256 q1Index = sorted.length / 4;
        uint256 q3Index = (sorted.length * 3) / 4;
        uint256 q1 = sorted[q1Index];
        uint256 q3 = sorted[q3Index];
        uint256 iqr = q3 - q1;
        
        uint256 lowerBound = q1 > (iqr * 3) / 2 ? q1 - (iqr * 3) / 2 : 0;
        uint256 upperBound = q3 + (iqr * 3) / 2;

        // Clip values
        for (uint256 i = 0; i < values.length; i++) {
            if (values[i] < lowerBound) {
                clipped[i] = lowerBound;
            } else if (values[i] > upperBound) {
                clipped[i] = upperBound;
            } else {
                clipped[i] = values[i];
            }
        }
    }

    /**
     * @notice Insertion sort for small arrays
     */
    function _insertionSort(WeightedValue[] memory arr) private pure {
        for (uint256 i = 1; i < arr.length; i++) {
            WeightedValue memory key = arr[i];
            int256 j = int256(i) - 1;

            while (j >= 0 && arr[uint256(j)].value > key.value) {
                arr[uint256(j + 1)] = arr[uint256(j)];
                j--;
            }
            arr[uint256(j + 1)] = key;
        }
    }

    /**
     * @notice Quick sort for larger arrays
     */
    function _quickSort(uint256[] memory arr, int256 left, int256 right) private pure {
        if (left >= right) return;
        
        int256 i = left;
        int256 j = right;
        uint256 pivot = arr[uint256(left + (right - left) / 2)];

        while (i <= j) {
            while (arr[uint256(i)] < pivot) i++;
            while (pivot < arr[uint256(j)]) j--;
            
            if (i <= j) {
                (arr[uint256(i)], arr[uint256(j)]) = (arr[uint256(j)], arr[uint256(i)]);
                i++;
                j--;
            }
        }

        if (left < j) _quickSort(arr, left, j);
        if (i < right) _quickSort(arr, i, right);
    }
}


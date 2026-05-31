# Production model: `best_v1.pt`

This file is the official SeeWise inspection model. Inference always uses the class names stored inside `best_v1.pt`.

| Index | Class |
|-------|--------|
| 0 | bottle |
| 1 | proper_fill |
| 2 | under_fill |
| 3 | over_fill |
| 4 | label_proper |
| 5 | label_torn |
| 6 | label_missing |

`dataset.yaml` documents the same order for reference only.

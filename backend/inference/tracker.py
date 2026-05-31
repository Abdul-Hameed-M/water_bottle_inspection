import numpy as np
from collections import OrderedDict

class CentroidTracker:
    def __init__(self, max_disappeared=40, max_distance=150):
        self.next_object_id = 1
        self.objects = OrderedDict()
        self.disappeared = OrderedDict()
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        
        # Store state history for each bottle ID: list of (timestamp, class_detections, coordinates)
        self.history = {}

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.history[self.next_object_id] = []
        self.next_object_id += 1
        return self.next_object_id - 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]
        # Keep history cached but limit size
        if len(self.history) > 1000:
            # Clean up oldest
            oldest_key = next(iter(self.history))
            del self.history[oldest_key]

    def update(self, rects):
        """
        rects: list of bounding boxes [x1, y1, x2, y2]
        Returns: dict of object_id -> centroid, dict of object_id -> rect
        """
        if len(rects) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects, {}

        input_centroids = np.zeros((len(rects), 2), dtype="int")
        input_rects = {}
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            input_centroids[i] = (cX, cY)
            input_rects[i] = (startX, startY, endX, endY)

        if len(self.objects) == 0:
            object_ids_mapped = []
            for i in range(0, len(input_centroids)):
                obj_id = self.register(input_centroids[i])
                object_ids_mapped.append(obj_id)
            
            mapped_rects = {}
            for idx, obj_id in enumerate(object_ids_mapped):
                mapped_rects[obj_id] = input_rects[idx]
            return self.objects, mapped_rects

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        # Compute Euclidean distance between all pairs
        D = np.linalg.norm(np.array(object_centroids)[:, np.newaxis] - input_centroids, axis=2)

        # To find matching pairs, find the minimum in each row
        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows = set()
        used_cols = set()

        mapped_rects = {}

        for (row, col) in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue

            if D[row, col] > self.max_distance:
                continue

            object_id = object_ids[row]
            self.objects[object_id] = input_centroids[col]
            self.disappeared[object_id] = 0
            mapped_rects[object_id] = input_rects[col]

            used_rows.add(row)
            used_cols.add(col)

        unused_rows = set(range(0, D.shape[0])).difference(used_rows)
        unused_cols = set(range(0, D.shape[1])).difference(used_cols)

        # Deregister older objects that are lost
        for row in unused_rows:
            object_id = object_ids[row]
            self.disappeared[object_id] += 1
            if self.disappeared[object_id] > self.max_disappeared:
                self.deregister(object_id)

        # Register new objects
        for col in unused_cols:
            obj_id = self.register(input_centroids[col])
            mapped_rects[obj_id] = input_rects[col]

        return self.objects, mapped_rects

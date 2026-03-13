import torch
try:
    ckpt = torch.load('models/crack_classifier.pth', weights_only=True, map_location='cpu')
    print(f"Latest Saved Epoch: {ckpt.get('epoch')}")
    print(f"Accuracy: {ckpt.get('accuracy')}%")
except Exception as e:
    print(f"Error reading model: {e}")

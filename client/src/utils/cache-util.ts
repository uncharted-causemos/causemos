// Simple first in first out cache
export class FIFOCache<ValueType> {
  private size: number;
  private queue: { key: string; value: ValueType }[];
  constructor(size = 20) {
    this.size = size;
    this.queue = [];
  }

  private getItem(key: string) {
    return this.queue.find((item) => item.key === key);
  }

  get(key: string) {
    return this.getItem(key)?.value;
  }

  set(key: string, value: ValueType) {
    const existingItem = this.getItem(key);
    if (existingItem) {
      existingItem.value = value;
      return value;
    }
    // else, add as new item
    const newItem = { key, value };
    this.queue.push(newItem);
    // Check the size of the queue and delete the first item if necessary
    if (this.queue.length > this.size) {
      this.queue.shift();
      return value;
    }
  }

  remove(key: string) {
    this.queue = this.queue.filter((item) => item.key !== key);
  }
}

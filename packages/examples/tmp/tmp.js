class Sub {
    let y = 0;

    constructor() {
        this::y = this.getInitialValueForY();
        console.log(this::x, this::y);
    }

    getInitialValueForY() {
        return 2;
    }
  }

  new Sub()
